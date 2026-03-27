import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid, uuid } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, EncabezadoSeccion, Ico, Vacio } from "../components/ui";
import { sileo } from "../utils/sileo";

// ─── CATÁLOGO DE CATEGORÍAS ──────────────────────────────────────────────────
const CATEGORIES = [
  { id: "comunicacion", label: "Comunicación con el cliente", icon: "mail" },
  { id: "alertas", label: "Alertas para los empleados", icon: "bell" },
  { id: "control", label: "Monitoreo y control de empleados", icon: "user-clock" },
  { id: "pago", label: "Pago", icon: "credit-card" },
  { id: "recurrentes", label: "Variables recurrentes", icon: "refresh" },
  { id: "anuncio", label: "Anuncio", icon: "megaphone" },
  { id: "workflow", label: "Administrar flujos de trabajo", icon: "git-branch" },
  { id: "cliente_info", label: "Información del cliente", icon: "user" },
  { id: "tareas", label: "Administrar tareas", icon: "check-circle" },
  { id: "datos", label: "Almacenamiento de datos", icon: "database" },
  { id: "otros", label: "Otros", icon: "layers" },
];

const OPERATORS = [
  { id: "==", label: "es igual a" },
  { id: "!=", label: "no es igual a" },
  { id: "contiene", label: "contiene" },
  { id: "no_contiene", label: "no contiene" },
  { id: ">", label: "es mayor que" },
  { id: "<", label: "es menor que" },
  { id: "set", label: "está completo" },
  { id: "not_set", label: "está vacío" },
];

/**
 * COMPONENTE: Dropdown Estilo ENSING (Enlace punteado)
 */
const ThemedSelect = ({ label, value, options, onChange, style = {} }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div style={{ position: "relative", ...style }}>
      {label && <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 4 }}>{label}</div>}
      <div
        onClick={() => setOpen(!open)}
        style={{ color: T.teal, fontSize: 13, fontWeight: 700, borderBottom: `1px dashed ${T.teal}`, cursor: "pointer", display: "inline-block", padding: "2px 0" }}
      >
        {selected ? selected.label : (value || "seleccionar")}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
          <div style={{ position: "absolute", top: "100%", left: 0, background: T.bg2, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", borderRadius: 12, border: `1px solid ${T.borderHi}`, zIndex: 9999, minWidth: 200, padding: 8, marginTop: 8, maxHeight: 300, overflowY: "auto" }}>
            {options.map(o => (
              <div
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); }}
                style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderRadius: 8, background: value === o.id ? T.tealSoft : "transparent", color: value === o.id ? T.teal : T.whiteOff, fontWeight: value === o.id ? 700 : 500, transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = value === o.id ? T.tealSoft : "transparent"}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── CATÁLOGO DE REGLAS (COMPLETO) ───────────────────────────────────────────
const ALL_RULES = [
  // COMUNICACIÓN (11 Reglas)
  { cat: "comunicacion", id: "enviar_email", label: "Enviar correo electrónico al cliente", sub: "Envía un mensaje de correo electrónico al cliente.", icon: "mail", color: "#06B6D4" },
  { cat: "comunicacion", id: "enviar_sms", label: "Enviar un SMS al cliente", sub: "Envía un mensaje de texto al móvil del cliente.", icon: "smartphone", color: "#06B6D4" },
  { cat: "comunicacion", id: "enviar_wa", label: "Enviar mensaje de Whatsapp", sub: "Envía un mensaje usando plantillas de WhatsApp.", icon: "wa", color: "#10B981" },
  { cat: "comunicacion", id: "llamar_cliente", label: "Llamada al cliente", sub: "Realice una llamada de voz automática al cliente.", icon: "phone", color: "#06B6D4" },
  { cat: "comunicacion", id: "msg_telegram", label: "Enviar mensaje de Telegram", sub: "Envía un mensaje a través del bot de Telegram.", icon: "send", color: "#06B6D4" },
  { cat: "comunicacion", id: "audio_msg", label: "Mensaje de audio", sub: "Envía un archivo de audio pregrabado al cliente.", icon: "mic", color: "#06B6D4" },
  { cat: "comunicacion", id: "booking_link", label: "Enviar link de reserva", sub: "Envía un enlace para que el cliente agende una cita.", icon: "calendar", color: "#06B6D4" },
  { cat: "comunicacion", id: "form_link", label: "Enviar link de formulario", sub: "Envía un enlace a un formulario de CRM.", icon: "file-text", color: "#06B6D4" },
  { cat: "comunicacion", id: "review_request", label: "Solicitar reseña", sub: "Pide al cliente una valoración tras una compra.", icon: "star", color: "#06B6D4" },
  { cat: "comunicacion", id: "promo_push", label: "Notificación Push", sub: "Envía una notificación push a la app móvil del cliente.", icon: "bell", color: "#06B6D4" },
  { cat: "comunicacion", id: "vcard_send", label: "Enviar tarjeta de contacto", sub: "Envía los datos del responsable en formato vCard.", icon: "user-plus", color: "#06B6D4" },

  // ALERTAS (9 Reglas)
  { cat: "alertas", id: "notif_user", label: "Agregar notificación", sub: "Notifica a un empleado sobre un cambio o evento.", icon: "bell", color: "#EC4899" },
  { cat: "alertas", id: "add_comment", label: "Agregar un comentario", sub: "Deja una nota interna en el historial del elemento.", icon: "note", color: "#EC4899" },
  { cat: "alertas", id: "send_chat_msg", label: "Enviar mensaje al chat", sub: "Notifica por el chat interno a un usuario o grupo.", icon: "send", color: "#EC4899" },
  { cat: "alertas", id: "task_alert", label: "Alerta de tarea vencida", sub: "Avisa cuando una tarea crítica está por vencer.", icon: "clock", color: "#EC4899" },
  { cat: "alertas", id: "manager_report", label: "Reporte al gerente", sub: "Envía un resumen de actividad al supervisor.", icon: "bar-chart", color: "#EC4899" },
  { cat: "alertas", id: "daily_digest", label: "Resumen diario", sub: "Envía una lista de pendientes al inicio del día.", icon: "list-ul", color: "#EC4899" },
  { cat: "alertas", id: "idle_alert", label: "Alerta de inactividad", sub: "Notifica si un lead no se ha movido en 3 días.", icon: "exclamation-triangle", color: "#EC4899" },
  { cat: "alertas", id: "success_sound", label: "Reproducir sonido", sub: "Emite un sonido de éxito en el navegador del usuario.", icon: "volume-up", color: "#EC4899" },
  { cat: "alertas", id: "email_internal", label: "Email interno", sub: "Envía un correo de notificación técnica al equipo.", icon: "mail", color: "#EC4899" },

  // CONTROL (6 Reglas)
  { cat: "control", id: "start_timer", label: "Iniciar temporizador", sub: "Mide el tiempo transcurrido en una etapa.", icon: "play", color: "#F59E0B" },
  { cat: "control", id: "stop_timer", label: "Detener temporizador", sub: "Finaliza la medición de tiempo actual.", icon: "stop", color: "#F59E0B" },
  { cat: "control", id: "log_activity", label: "Registrar actividad", sub: "Guarda un log detallado del evento de control.", icon: "history", color: "#F59E0B" },
  { cat: "control", id: "geo_check", label: "Verificar ubicación", sub: "Valida la ubicación GPS si es reporte de campo.", icon: "map-pin", color: "#F59E0B" },
  { cat: "control", id: "idle_reassign", label: "Reasignar por inactividad", sub: "Cambia el responsable si el lead se ignora.", icon: "user-minus", color: "#F59E0B" },
  { cat: "control", id: "quota_check", label: "Verificar cuotas", sub: "Comprueba si el usuario ha cumplido sus objetivos.", icon: "check-circle", color: "#F59E0B" },

  // PAGO (5 Reglas)
  { cat: "pago", id: "gen_invoice", label: "Generar factura", sub: "Crea un borrador de factura automáticamente.", icon: "file-invoice", color: "#6366F1" }, // Indigo
  { cat: "pago", id: "send_payment_link", label: "Enviar link de pago", sub: "Envía enlace de PayPal/Stripe por email/WA.", icon: "credit-card", color: "#6366F1" },
  { cat: "pago", id: "check_payment", label: "Verificar pago", sub: "Consulta el estado de la transacción en la pasarela.", icon: "sync", color: "#6366F1" },
  { cat: "pago", id: "record_refund", label: "Registrar reembolso", sub: "Anota una devolución en el historial financiero.", icon: "undo", color: "#6366F1" },
  { cat: "pago", id: "tax_calc", label: "Calcular impuestos", sub: "Ajusta el monto total según la región impositiva.", icon: "percentage", color: "#6366F1" },

  // ANUNCIO (4 Reglas)
  { cat: "anuncio", id: "fb_pixel", label: "Facebook Pixel", sub: "Envía evento de conversión a Facebook.", icon: "facebook", color: "#4F46E5" }, // Deep Indigo
  { cat: "anuncio", id: "google_ads", label: "Google Ads Offline", sub: "Sube conversión offline a Google Ads.", icon: "google", color: "#4F46E5" },
  { cat: "anuncio", id: "retarget_list", label: "Añadir a lista retargeting", sub: "Sincroniza el email con audiencias de ads.", icon: "users", color: "#4F46E5" },
  { cat: "anuncio", id: "lead_source_track", label: "Track de fuente", sub: "Atribuye la conversión a la campaña original.", icon: "link", color: "#4F46E5" },

  // WORKFLOW (12 Reglas)
  { cat: "workflow", id: "mod_item", label: "Modificar elemento", sub: "Actualiza los campos de la negociación.", icon: "edit", color: "#6B7280" },
  { cat: "workflow", id: "change_stage", label: "Cambiar etapa", sub: "Mueve el elemento a otra columna del pipeline.", icon: "arrow", color: "#6B7280" },
  { cat: "workflow", id: "change_resp", label: "Cambiar responsable", sub: "Asigna una nueva persona a cargo.", icon: "user", color: "#6B7280" },
  { cat: "workflow", id: "delete_item", label: "Eliminar elemento", sub: "Borra permanentemente el deal.", icon: "trash", color: "#EF4444" },
  { cat: "workflow", id: "copy_deal", label: "Copiar negociación", sub: "Crea un duplicado en otro pipeline.", icon: "clone", color: "#6B7280" },
  { cat: "workflow", id: "lock_deal", label: "Bloquear edición", sub: "Impide cambios manuales al elemento.", icon: "lock", color: "#6B7280" },
  { cat: "workflow", id: "wait_worker", label: "Esperar empleado", sub: "Pausa el flujo hasta que alguien valide.", icon: "pause", color: "#6B7280" },
  { cat: "workflow", id: "run_webhook", label: "Ejecutar Webhook", sub: "Envía datos a una URL externa (Make/Zapier).", icon: "code", color: "#6B7280" },
  { cat: "workflow", id: "gen_document", label: "Generar documento", sub: "Crea un PDF (Contrato/Presupuesto).", icon: "file-pdf", color: "#6B7280" },
  { cat: "workflow", id: "add_tag", label: "Agregar etiqueta", sub: "Añade un tag para segmentación.", icon: "tag", color: "#6B7280" },
  { cat: "workflow", id: "remove_tag", label: "Quitar etiqueta", sub: "Elimina un tag específico.", icon: "tag-slash", color: "#6B7280" },
  { cat: "workflow", id: "archive_deal", label: "Archivar", sub: "Mueve a la papelera o archivo histórico.", icon: "archive", color: "#6B7280" },

  // CLIENTE INFO (6 Reglas)
  { cat: "cliente_info", id: "upd_contact", label: "Actualizar contacto", sub: "Modifica email o teléfono del cliente.", icon: "user-edit", color: "#4B5563" },
  { cat: "cliente_info", id: "upd_company", label: "Actualizar empresa", sub: "Modifica datos de la razón social.", icon: "building", color: "#4B5563" },
  { cat: "cliente_info", id: "link_contact", label: "Vincular contacto", sub: "Une un deal con un contacto existente.", icon: "link", color: "#4B5563" },
  { cat: "cliente_info", id: "validate_vat", label: "Validar NIT/RUT", sub: "Comprueba validez tributaria del cliente.", icon: "id-card", color: "#4B5563" },
  { cat: "cliente_info", id: "scoring", label: "Lead Scoring", sub: "Suma puntos según el perfil del cliente.", icon: "trophy", color: "#4B5563" },
  { cat: "cliente_info", id: "loyalty_program", label: "Programa de puntos", sub: "Añade puntos de fidelidad tras compra.", icon: "gift", color: "#4B5563" },

  // TAREAS (8 Reglas)
  { cat: "tareas", id: "create_task", label: "Crear tarea", sub: "Genera un pendiente para el responsable.", icon: "plus-square", color: "#10B981" },
  { cat: "tareas", id: "complete_task", label: "Completar tarea", sub: "Marca como listo un pendiente abierto.", icon: "check-circle", color: "#10B981" },
  { cat: "tareas", id: "task_checklist", label: "Añadir checklist", sub: "Agrega pasos a una tarea existente.", icon: "tasks", color: "#10B981" },
  { cat: "tareas", id: "delegate_task", label: "Delegar tarea", sub: "Pasa el pendiente a otro compañero.", icon: "user-tag", color: "#10B981" },
  { cat: "tareas", id: "task_dead", label: "Mover fecha límite", sub: "Aplasta el deadline de una tarea.", icon: "calendar-day", color: "#10B981" },
  { cat: "tareas", id: "critical_task", label: "Marcar tarea crítica", sub: "Establece prioridad máxima.", icon: "fire", color: "#10B981" },
  { cat: "tareas", id: "gen_subtask", label: "Crear subtarea", sub: "Crea un hijo de una tarea padre.", icon: "indent", color: "#10B981" },
  { cat: "tareas", id: "task_reminder", label: "Recordatorio de tarea", sub: "Avisa al usuario 10 min antes.", icon: "bell", color: "#10B981" },

  // DATOS (5 Reglas)
  { cat: "datos", id: "save_history", label: "Bitácora externa", sub: "Escribe en una hoja de Google Sheets.", icon: "google-drive", color: "#F59E0B" },
  { cat: "datos", id: "export_json", label: "Exportar JSON", sub: "Genera un archivo de datos para descarga.", icon: "file-code", color: "#F59E0B" },
  { cat: "datos", id: "sync_db", label: "Sincronizar base externa", sub: "Actualiza SQL o NoSQL de terceros.", icon: "database", color: "#F59E0B" },
  { cat: "datos", id: "data_clean", label: "Limpieza de datos", sub: "Estandariza mayúsculas y quita espacios.", icon: "broom", color: "#F59E0B" },
  { cat: "datos", id: "backup_deal", label: "Copia de seguridad", sub: "Guarda snapshot del deal cifrado.", icon: "save", color: "#F59E0B" },

  // OTROS (5 Reglas)
  { cat: "otros", id: "run_script", label: "Ejecutar Script Custom", sub: "Llama a código personalizado JS/Python.", icon: "terminal", color: "#4B5563" },
  { cat: "otros", id: "delay_wf", label: "Pausar flujo", sub: "Detiene el proceso por X minutos.", icon: "hourglass-half", color: "#4B5563" },
  { cat: "otros", id: "random_split", label: "División aleatoria", sub: "Envía a ruta A o B para pruebas A/B.", icon: "random", color: "#4B5563" },
  { cat: "otros", id: "loop_cond", label: "Loop condicional", sub: "Repite acciones mientras se cumpla algo.", icon: "undo-alt", color: "#4B5563" },
  { cat: "otros", id: "external_trigger", label: "Disparador Externo", sub: "Espera una señal de una API propia.", icon: "satellite-dish", color: "#4B5563" },
];

export const Automatizaciones = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t }) => {
  const [tab, setTab] = useState("reglas");
  const [pipelineId, setPipelineId] = useState(db.pipelines?.[0]?.id || "");
  const [wfs, setWfs] = useState(Array.isArray(db.automatizaciones) ? db.automatizaciones : []);
  const [showAdd, setShowAdd] = useState(false);
  const [addStageId, setAddStageId] = useState(null);
  const [catSel, setCatSel] = useState("comunicacion");
  const [q, setQ] = useState("");

  // INSPECTOR STATE
  const [editRule, setEditRule] = useState(null);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // ─── COMPUTAR CAMPOS DINÁMICOS (ALINEADOS CON ESQUEMA REAL) ────────────────
  const crmFields = [
    { id: "titulo", label: "Título del lead / negocio", type: "text" }, // ALINEADO CON db.deals.titulo
    { id: "valor", label: "Monto", type: "number" }, // ALINEADO CON db.deals.valor
    { id: "prob", label: "Probabilidad (%)", type: "number" }, // ALINEADO CON db.deals.prob
    { id: "fuente", label: "Fuente", type: "select" },
    { id: "responsable", label: "Persona responsable", type: "user" },
    { id: "fecha_cierre", label: "Fecha de cierre", type: "date" }, // ALINEADO CON db.deals.fecha_cierre
    { id: "creado", label: "Fecha de creación", type: "date" },
    { id: "modificado", label: "Fecha de modificación", type: "date" },
    { id: "pipeline", label: "Pipeline", type: "select" },
    ...(db.campos_personalizados || [])
      .filter(f => f.entidad === 'deal')
      .map(f => ({ id: f.id, label: f.nombre, type: f.tipo || "text" })),
    { id: "cliente_nombre", label: "Nombre del contacto", type: "text" },
    { id: "cliente_email", label: "Email del contacto", type: "text" },
    { id: "cliente_tel", label: "Teléfono del contacto", type: "text" },
    { id: "empresa_nombre", label: "Nombre de la empresa", type: "text" },
    ...Object.keys(db.deals?.[0] || {}).filter(k => !["id", "org_id", "pipeline_id", "etapa_id", "config", "creado", "modificado", "titulo", "valor", "prob", "fecha_cierre", "responsable"].includes(k)).map(k => ({ id: k, label: k, type: "text" }))
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i); // Evitar duplicados

  useEffect(() => {
    if (Array.isArray(db.automatizaciones)) setWfs(db.automatizaciones);
  }, [db.automatizaciones]);

  const pipeline = (db.pipelines || []).find(p => p.id === pipelineId) || (db.pipelines || [])[0];
  const etapas = pipeline?.etapas || [];
  const usuarios = db.usuariosApp || [];

  const handleAgregarRegla = async (ruleId) => {
    const ruleDef = ALL_RULES.find(r => r.id === ruleId);
    if (!ruleDef) return;

    const newRule = {
      id: uuid(),
      nombre: ruleDef.label,
      etapa_id: addStageId,
      pipeline_id: pipelineId,
      org_id: db.usuario?.org_id,
      tipo: ruleId,
      config: {
        sub: ruleDef.sub,
        ejecucion: "paralelo",
        hora: "inmediatamente",
        condiciones: [],
        campos: [],
        mensaje: "",
        asunto: "",
        destinatario: "responsable",
        etapa_destino: "",
        responsable_id: "",
        titulo_tarea: "",
        desc_tarea: ""
      },
      activo: true,
    };

    setWfs(prev => [...prev, newRule]);
    try {
      await guardarEnSupa("automatizaciones", newRule);
    } catch (err) { console.error("Error al guardar:", err); }
    setShowAdd(false);
  };

  const handleUpdateRule = async (updated) => {
    setWfs(prev => prev.map(w => w.id === updated.id ? updated : w));
    try {
      await guardarEnSupa("automatizaciones", updated);
    } catch (err) { console.error("Error al actualizar:", err); }
    setEditRule(null);
  };

  const handleEliminar = async (id) => {
    setWfs(prev => prev.filter(w => w.id !== id));
    await eliminarDeSupa("automatizaciones", id);
  };

  const addFieldToRule = (field) => {
    const mode = showFieldMenu; // 'condicion' o 'campos'
    if (mode === 'campos') {
      const currentCampos = editRule.config?.campos || [];
      if (currentCampos.find(c => c.id === field.id)) return setShowFieldMenu(false);
      setEditRule({
        ...editRule,
        config: { ...editRule.config, campos: [...currentCampos, { ...field, value: "" }] }
      });
    } else if (mode === 'condicion') {
      const currentConds = editRule.config?.condiciones || [];
      setEditRule({
        ...editRule,
        config: { ...editRule.config, condiciones: [...currentConds, { id: uuid(), fieldId: field.id, label: field.label, op: "==", val: "" }] }
      });
    }
    setShowFieldMenu(false);
  };

  const reglasPorEtapa = (eId) => wfs.filter(w => w && w.etapa_id === eId && w.pipeline_id === pipelineId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: T.bg0, borderRadius: 20, overflow: "hidden", border: `1px solid ${T.borderHi}`, position: "relative" }}>

      {/* HEADER PREMIUM STYLE */}
      <div style={{ background: T.bg1, padding: "0 24px", borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.tealDark, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", boxShadow: `0 8px 16px ${T.tealSoft}` }}>
              <Ico k="refresh" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>{t("Manualización y Disparadores")}</div>
              <div style={{ fontSize: 13, color: T.whiteDim }}>Pipeline: <b style={{ color: T.teal }}>{pipeline?.nombre}</b></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="secundario" size="sm" style={{ fontWeight: 700, borderRadius: 10, borderColor: T.borderHi }}
              onClick={() => sileo.info("Extensiones", { description: "Próximamente: Mercado de extensiones para automatizaciones externas." })}>
              EXTENSIONES
            </Btn>
            <Btn style={{ background: testMode ? T.amber : T.teal, color: "#000", fontWeight: 800, borderRadius: 10, border: "none" }} size="sm"
              onClick={() => {
                setTestMode(!testMode);
                sileo.warning(!testMode ? "Modo Prueba Activado" : "Modo Prueba Desactivado", { 
                  description: !testMode ? "Las automatizaciones no enviarán emails reales durante este modo." : "El sistema ha vuelto a modo producción." 
                });
              }}>
              {testMode ? "SALIR DE PRUEBA" : "MODO PRUEBA"}
            </Btn>
          </div>
        </div>

        {/* MODERN TABS */}
        <div style={{ display: "flex", gap: 32 }}>
          {[
            { id: "reglas", label: "Automatización" },
            { id: "variables", label: "Variables" },
            { id: "constantes", label: "Constantes" },
            { id: "logs", label: "Historial" }
          ].map(m => (
            <div key={m.id} onClick={() => setTab(m.id)} style={{ padding: "16px 0", fontSize: 14, fontWeight: tab === m.id ? 800 : 600, color: tab === m.id ? T.teal : T.whiteDim, borderBottom: `3px solid ${tab === m.id ? T.teal : "transparent"}`, cursor: "pointer", transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT SWITCHER */}
      {tab === "reglas" && (
        <>
          {/* TOOLBAR */}
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Btn size="sm" style={{ background: T.white, color: T.bg0, border: "none", fontWeight: 800, padding: "8px 20px", borderRadius: 10 }} onClick={() => { setAddStageId(etapas[0]?.id); setShowAdd(true); }}>CREAR REGLA</Btn>
              <Sel value={pipelineId} onChange={e => setPipelineId(e.target.value)} style={{ width: 180, background: T.bg1, border: `1px solid ${T.borderHi}`, height: 38, borderRadius: 10, color: T.white }}>
                {db.pipelines?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Sel>
              <div style={{ position: "relative" }}>
                <Ico k="search" size={14} style={{ position: "absolute", left: 14, top: 12, color: T.whiteDim }} />
                <Inp placeholder={t("buscar")} value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 38, width: 260, height: 38, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, color: T.white }} />
              </div>
            </div>
          </div>

          {/* STAGE BOARD */}
          <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: "flex", padding: "0 24px 24px" }}>
            <div style={{ display: "flex", gap: 16, height: "100%" }}>
              {etapas.map((et, idx) => (
                <div key={et.id} style={{ width: 240, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* STAGE HEADER ENSING STYLE */}
                  <div style={{
                    background: et.color || T.tealDark,
                    padding: "12px 20px",
                    color: "#FFF",
                    fontSize: 12,
                    fontWeight: 900,
                    position: "relative",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    minHeight: 46,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    boxShadow: "var(--shadow-sm)"
                  }}>
                    {et.nombre}
                  </div>

                  {/* ADD BUTTON */}
                  <div onClick={() => { setAddStageId(et.id); setShowAdd(true); }} style={{
                    height: 40,
                    border: `1px dashed ${T.borderHi}`,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.whiteDim,
                    fontSize: 22,
                    cursor: "pointer",
                    background: T.bg1,
                    transition: "all .3s",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = T.bg2; }}>
                    <Ico k="plus" size={18} />
                  </div>

                  {/* COLUMN CONTENT */}
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                    {reglasPorEtapa(et.id).map(r => {
                      const def = ALL_RULES.find(dr => dr.id === r.tipo) || ALL_RULES[0];
                      return (
                        <Tarjeta key={r.id} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, padding: 16, borderRadius: 16, boxShadow: "0 10px 20px rgba(0,0,0,0.08)", position: "relative", transition: "all .2s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: def.type === "trigger" ? T.amber : T.teal, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>{def.type === "trigger" ? "Disparador" : (r.config?.hora === "inmediatamente" ? "inmediatamente" : `En ${r.config?.hora}`)}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: T.white, lineHeight: "1.3" }}>{r.nombre}</div>
                            </div>
                            <div onClick={() => setEditRule(r)} style={{ color: T.whiteDim, cursor: "pointer", paddingVertical: 4 }}><Ico k="edit" size={14} /></div>
                          </div>
                          <div style={{ fontSize: 12, color: T.whiteFade, lineHeight: "1.5", fontStyle: "italic" }}>{r.config?.sub || def.sub}</div>
                          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                            <div onClick={() => setEditRule(r)} style={{ color: T.teal, fontSize: 11, fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}>ajustar</div>
                            <div onClick={() => handleEliminar(r.id)} style={{ color: T.red, fontSize: 11, fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}>quitar</div>
                          </div>
                        </Tarjeta>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "variables" && (
        <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
          <EncabezadoSeccion titulo="Variables Dinámicas" sub="Configura valores globales que puedes inyectar en tus correos o mensajes." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            <Tarjeta style={{ background: T.bg1, padding: 40, textAlign: "center", border: `2px dashed ${T.borderHi}`, borderRadius: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, transition: "all .3s" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: T.bg2, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.teal, boxShadow: "var(--shadow-sm)" }}>
                <Ico k="plus" size={28} />
              </div>
              <div style={{ fontWeight: 800, color: T.white, fontSize: 16 }}>Crear Nueva Variable</div>
              <Btn style={{ background: T.teal, color: "#000", fontWeight: 800, padding: "10px 24px", borderRadius: 12 }} size="sm" 
                onClick={() => sileo.info("Funcionalidad Pro", { description: "La creación de variables personalizadas se habilita una vez que tengas un flujo activo." })}>
                INICIAR
              </Btn>
            </Tarjeta>
            {[
              { n: "descuento_promo", v: "20%", t: "Porcentaje" },
              { n: "bot_signature", v: "Soporte ENSINGCRM", t: "Firma" }
            ].map(v => (
              <Tarjeta key={v.n} style={{ background: T.bg1, padding: 24, border: `1px solid ${T.borderHi}`, borderRadius: 24, boxShadow: "0 15px 35px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: T.teal, textTransform: "uppercase", letterSpacing: ".1em", background: T.tealSoft, padding: "4px 10px", borderRadius: 6 }}>{v.t}</div>
                  <Ico k="edit" size={16} style={{ color: T.whiteDim, cursor: "pointer" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>{v.n}</div>
                <div style={{ fontSize: 14, color: T.whiteOff, background: T.bg2, padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.border}`, fontFamily: "monospace" }}>{v.v}</div>
              </Tarjeta>
            ))}
          </div>
        </div>
      )}

      {tab === "constantes" && (
        <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
          <EncabezadoSeccion titulo="Valores de Sistema" sub="Referencias fijas de la plataforma para tus automatizaciones." />
          <div style={{ background: T.bg1, borderRadius: 24, border: `1px solid ${T.borderHi}`, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: T.bg2, borderBottom: `1px solid ${T.borderHi}` }}>
                <tr>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em" }}>Constante</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em" }}>Valor Actual</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em" }}>Función</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: "ROOT_NAME", v: "ENSING HQ", d: "ID Maestra de la organización" },
                  { n: "DEFAULT_LOCALE", v: "es_ES", d: "Idioma nativo para reportes" },
                  { n: "API_GATEWAY", v: "v2.secure.ensin.ai", d: "Endpoint de conexión de servicios" }
                ].map(c => (
                  <tr key={c.n} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "18px 24px", fontSize: 14, fontWeight: 800, color: T.white }}>{c.n}</td>
                    <td style={{ padding: "18px 24px", fontSize: 14, color: T.teal, fontWeight: 700, fontFamily: "monospace" }}>{c.v}</td>
                    <td style={{ padding: "18px 24px", fontSize: 14, color: T.whiteFade }}>{c.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
          <EncabezadoSeccion titulo="Logs de Actividad" sub="Monitoreo en tiempo real de los disparadores y sus respuestas." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { t: "Notificación WA", d: "Venta Mayorista #02", s: "Success", h: "10:15:32", c: T.green },
              { t: "Cálculo Scoring", d: "Lead: Mario Rossi", s: "Success", h: "09:42:11", c: T.green },
              { t: "Zendesk Sync", d: "Soporte #883", s: "Failed", h: "08:12:05", c: T.red },
            ].map((l, i) => (
              <Tarjeta key={i} style={{ background: T.bg1, padding: "18px 24px", border: `1px solid ${T.borderHi}`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: l.c + "15", color: l.c, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${l.c}30` }}>
                    <Ico k={l.s === "Success" ? "check" : "exclamation-triangle"} size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.white }}>{l.t}</div>
                    <div style={{ fontSize: 13, color: T.whiteFade }}>Ref: {l.d}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: l.c, textTransform: "uppercase", letterSpacing: ".1em" }}>{l.s}</div>
                  <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 600 }}>{l.h}</div>
                </div>
              </Tarjeta>
            ))}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Btn variant="fantasma" size="sm" style={{ color: T.teal, fontWeight: 800 }} onClick={() => setTab("logs")}>EXPLORAR HISTORIAL</Btn>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEARCH FIELD OVERLAY */}
      {showFieldMenu && (
        <>
          <div onClick={() => setShowFieldMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: 500, background: T.bg1, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", borderRadius: 24, zIndex: 10001, border: `1px solid ${T.borderHi}`, maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${T.borderHi}`, fontWeight: 800, fontSize: 16, display: "flex", justifyContent: "space-between", color: T.white }}>
              Propiedades del CRM
              <span onClick={() => setShowFieldMenu(false)} style={{ cursor: "pointer", color: T.whiteDim }}><Ico k="x" size={18} /></span>
            </div>
            <div style={{ padding: 12 }}>
              {crmFields.map(f => (
                <div key={f.id} onClick={() => addFieldToRule(f)} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", borderRadius: 12, color: T.whiteOff, display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => { e.currentTarget.style.background = T.bg2; e.currentTarget.style.color = T.teal; }}>
                  {f.label} <span style={{ fontSize: 11, color: T.whiteFade, textTransform: "uppercase", fontWeight: 700 }}>{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ADD NEW RULE MENU (MODERN) */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={<span style={{ color: T.white, fontWeight: 800 }}>{t("Catálogo de Automatizaciones")}</span>} width={1000}>
        <div style={{ display: "flex", height: 600, margin: "-22px" }}>
          <div style={{ width: 280, background: T.bg2, borderRight: `1px solid ${T.borderHi}`, padding: "20px 0", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ padding: "0 20px 20px" }}>
              <Inp value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por acción..." style={{ height: 44, fontSize: 14, background: T.bg1, border: `1px solid ${T.border}`, color: T.white, borderRadius: 14 }} />
            </div>
            {CATEGORIES.map(c => (
              <div key={c.id} onClick={() => setCatSel(c.id)} style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", background: catSel === c.id ? T.bg1 : "transparent", color: catSel === c.id ? T.teal : T.whiteDim, borderLeft: `5px solid ${catSel === c.id ? T.teal : "transparent"}`, fontWeight: catSel === c.id ? 800 : 500, transition: "background .2s" }}>
                <div style={{ color: catSel === c.id ? T.teal : T.whiteFade }}><Ico k={c.icon} size={18} /></div>
                <span style={{ fontSize: 14 }}>{c.label}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: "30px 40px", overflowY: "auto", background: T.bg1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ALL_RULES.filter(r => (q ? (r.label.toLowerCase().includes(q.toLowerCase()) || r.sub.toLowerCase().includes(q.toLowerCase())) : r.cat === catSel)).map(r => (
                <Tarjeta key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px", border: `1px solid ${T.border}`, borderRadius: 20, background: T.bg1, transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                      <div style={{ color: r.color || T.teal, background: (r.color || T.teal) + "15", padding: 8, borderRadius: 10 }}><Ico k={r.icon} size={20} /></div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>{r.label}</div>
                    </div>
                    <div style={{ fontSize: 14, color: T.whiteFade }}>{r.sub}</div>
                  </div>
                  <Btn onClick={() => handleAgregarRegla(r.id)} style={{ padding: "10px 24px", background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, fontWeight: 800, borderRadius: 10 }}>{t("Agregar")}</Btn>
                </Tarjeta>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* INSPECTOR MODAL */}
      <Modal open={!!editRule} onClose={() => setEditRule(null)} title={<span style={{ color: T.white, fontWeight: 800 }}>{editRule?.nombre}</span>} width={700}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "10px 5px" }}>

          <div style={{ display: "flex", gap: 24, paddingBottom: 24, borderBottom: `1px solid ${T.borderHi}` }}>
            <div style={{ flex: 1 }}>
              <ThemedSelect
                label="Modo de Ejecución"
                value={editRule?.config?.ejecucion || "paralelo"}
                options={[{ id: "paralelo", label: "En paralelo" }, { id: "secuencial", label: "Secuencial" }]}
                onChange={v => setEditRule({ ...editRule, config: { ...editRule.config, ejecucion: v } })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <ThemedSelect
                label="Tiempo de Retraso"
                value={editRule?.config?.hora || "inmediatamente"}
                options={[{ id: "inmediatamente", label: "Inmediatamente" }, { id: "1h", label: "En 1 hora" }, { id: "1d", label: "En 1 día" }]}
                onChange={v => setEditRule({ ...editRule, config: { ...editRule.config, hora: v } })}
              />
            </div>
          </div>

          {/* CONDITIONS EDITOR */}
          <div style={{ background: T.bg2, padding: 24, borderRadius: 20, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
              <Ico k="lightning" size={16} /> Condición de Disparo
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {editRule?.config?.condiciones?.map((cond, i) => (
                <div key={cond.id} style={{ display: "flex", gap: 12, alignItems: "center", background: T.bg1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.whiteOff, width: 130 }}>{cond.label}</div>
                  <ThemedSelect
                    value={cond.op}
                    options={OPERATORS}
                    onChange={v => {
                      const newConds = [...editRule.config.condiciones];
                      newConds[i].op = v;
                      setEditRule({ ...editRule, config: { ...editRule.config, condiciones: newConds } });
                    }}
                  />
                  <Inp
                    value={cond.val}
                    onChange={e => {
                      const newConds = [...editRule.config.condiciones];
                      newConds[i].val = e.target.value;
                      setEditRule({ ...editRule, config: { ...editRule.config, condiciones: newConds } });
                    }}
                    placeholder="valor..."
                    style={{ flex: 1, background: T.bg2, height: 32, fontSize: 13, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white }}
                  />
                  <div onClick={() => {
                    const newConds = editRule.config.condiciones.filter(c => c.id !== cond.id);
                    setEditRule({ ...editRule, config: { ...editRule.config, condiciones: newConds } });
                  }} style={{ color: T.red, cursor: "pointer", padding: 6 }}><Ico k="trash" size={16} /></div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <span onClick={() => setShowFieldMenu("condicion")} style={{ color: T.teal, fontSize: 13, fontWeight: 800, cursor: "pointer", borderBottom: `2px solid ${T.tealSoft}`, paddingBottom: 2 }}>+ AGREGAR REGLA LÓGICA</span>
              </div>
            </div>
          </div>

          {/* FIELDS EDITOR */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* NOTIFICACIONES */}
            {(editRule?.tipo.includes("enviar") || editRule?.tipo === "notif_user" || editRule?.tipo === "send_chat_msg" || editRule?.tipo === "add_comment" || editRule?.tipo.includes("msg") || editRule?.tipo.includes("notif")) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>Contenido Automatizado</div>
                {editRule.tipo.includes("email") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 700 }}>Asunto del Correo:</div>
                    <Inp value={editRule.config?.asunto} onChange={e => setEditRule({ ...editRule, config: { ...editRule.config, asunto: e.target.value } })} style={{ background: T.bg1, color: T.white, border: `1px solid ${T.border}`, borderRadius: 10, height: 40 }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 700 }}>Cuerpo del Mensaje:</div>
                  <textarea
                    value={editRule.config?.mensaje}
                    onChange={e => setEditRule({ ...editRule, config: { ...editRule.config, mensaje: e.target.value } })}
                    style={{ width: "100%", height: 120, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg1, color: T.white, padding: 16, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "none", lineHeight: "1.5" }}
                    placeholder="Escribe el mensaje... {nombre} se reemplazará automáticamente."
                  />
                </div>
                <ThemedSelect
                  label="Enviar a"
                  value={editRule.config?.destinatario || "responsable"}
                  options={[{ id: "responsable", label: "Persona responsable" }, { id: "cliente", label: "Cliente (Contacto/Empresa)" }, { id: "todos", label: "Toda la organización" }]}
                  onChange={v => setEditRule({ ...editRule, config: { ...editRule.config, destinatario: v } })}
                />
              </div>
            )}

            {/* MOD_ITEM / CAMPOS */}
            {(editRule?.tipo === "mod_item" || editRule?.tipo === "upd_contact" || editRule?.tipo === "upd_company") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>Actualización de Propiedades</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {editRule.config?.campos?.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", background: T.bg2, padding: "12px 16px", borderRadius: 12 }}>
                      <div style={{ width: 150, fontSize: 13, fontWeight: 700, color: T.whiteDim }}>{f.label}</div>
                      <Inp
                        value={f.value}
                        onChange={e => {
                          const newCampos = [...editRule.config.campos];
                          newCampos[i].value = e.target.value;
                          setEditRule({ ...editRule, config: { ...editRule.config, campos: newCampos } });
                        }}
                        style={{ flex: 1, background: T.bg1, color: T.white, height: 36, border: `1px solid ${T.border}`, borderRadius: 8 }}
                      />
                      <div style={{ color: T.red, cursor: "pointer", padding: 6 }} onClick={() => {
                        const newCampos = editRule.config.campos.filter((_, idx) => idx !== i);
                        setEditRule({ ...editRule, config: { ...editRule.config, campos: newCampos } });
                      }}><Ico k="trash" size={16} /></div>
                    </div>
                  ))}
                  <div style={{ marginTop: 4 }}>
                    <span onClick={() => setShowFieldMenu("campos")} style={{ color: T.teal, fontSize: 13, fontWeight: 800, cursor: "pointer", borderBottom: `2px solid ${T.tealSoft}` }}>+ SELECCIONAR PROPIEDAD</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 32, display: "flex", gap: 16, borderTop: `1px solid ${T.borderHi}`, paddingTop: 28 }}>
            <Btn onClick={() => handleUpdateRule(editRule)} style={{ background: T.teal, color: "#000", border: "none", padding: "12px 40px", fontSize: 14, fontWeight: 900, borderRadius: 12 }}>GUARDAR CAMBIOS</Btn>
            <Btn variant="secundario" onClick={() => setEditRule(null)} style={{ padding: "12px 30px", fontSize: 14, fontWeight: 700, borderRadius: 12, background: T.bg1, color: T.whiteOff, border: `1px solid ${T.borderHi}` }}>DESCARTAR</Btn>
          </div>

        </div>
      </Modal>

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${T.borderHi}; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        
        select option {
           background: ${T.bg2} !important;
           color: ${T.white} !important;
        }
      `}</style>
    </div>
  );
};
