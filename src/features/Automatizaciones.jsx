import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { uid, uuid } from "../utils";
import { Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, EncabezadoSeccion, Ico, Vacio } from "../components/ui";

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
 * COMPONENTE: Dropdown Estilo Bitrix (Enlace punteado)
 */
const BitrixSelect = ({ label, value, options, onChange, style = {} }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div style={{ position: "relative", ...style }}>
      {label && <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>}
      <div 
        onClick={() => setOpen(!open)}
        style={{ color: "#00B4FF", fontSize: 13, fontWeight: 600, borderBottom: "1px dashed #00B4FF", cursor: "pointer", display: "inline-block", padding: "2px 0" }}
      >
        {selected ? selected.label : (value || "seleccionar")}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
          <div style={{ position: "absolute", top: "100%", left: 0, background: "#FFF", boxShadow: "0 5px 20px rgba(0,0,0,0.15)", borderRadius: 8, border: "1px solid #EEE", zIndex: 9999, minWidth: 180, padding: 6, marginTop: 4, maxHeight: 300, overflowY: "auto" }}>
             {options.map(o => (
               <div 
                key={o.id} 
                onClick={() => { onChange(o.id); setOpen(false); }}
                style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderRadius: 4, background: value === o.id ? "#F0F7FF" : "transparent", color: value === o.id ? "#00B4FF" : "#333" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F5F5F5"}
                onMouseLeave={e => e.currentTarget.style.background = value === o.id ? "#F0F7FF" : "transparent"}
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
  { cat: "pago", id: "gen_invoice", label: "Generar factura", sub: "Crea un borrador de factura automáticamente.", icon: "file-invoice", color: "#3B82F6" },
  { cat: "pago", id: "send_payment_link", label: "Enviar link de pago", sub: "Envía enlace de PayPal/Stripe por email/WA.", icon: "credit-card", color: "#3B82F6" },
  { cat: "pago", id: "check_payment", label: "Verificar pago", sub: "Consulta el estado de la transacción en la pasarela.", icon: "sync", color: "#3B82F6" },
  { cat: "pago", id: "record_refund", label: "Registrar reembolso", sub: "Anota una devolución en el historial financiero.", icon: "undo", color: "#3B82F6" },
  { cat: "pago", id: "tax_calc", label: "Calcular impuestos", sub: "Ajusta el monto total según la región impositiva.", icon: "percentage", color: "#3B82F6" },

  // RECURRENTES (4 Reglas)
  { cat: "recurrentes", id: "repeat_deal", label: "Repetir negociación", sub: "Crea una copia del deal para el próximo ciclo.", icon: "refresh", color: "#8B5CF6" },
  { cat: "recurrentes", id: "sub_invoice", label: "Suscripción mensual", sub: "Genera cobros recurrentes cada 30 días.", icon: "calendar-alt", color: "#8B5CF6" },
  { cat: "recurrentes", id: "renew_reminder", label: "Recordatorio de renovación", sub: "Avisa 15 días antes del vencimiento.", icon: "bell", color: "#8B5CF6" },
  { cat: "recurrentes", id: "stop_recurrence", label: "Detener recurrencia", sub: "Cancela las repeticiones automáticas.", icon: "ban", color: "#8B5CF6" },

  // ANUNCIO (4 Reglas)
  { cat: "anuncio", id: "fb_pixel", label: "Facebook Pixel", sub: "Envía evento de conversión a Facebook.", icon: "facebook", color: "#1D4ED8" },
  { cat: "anuncio", id: "google_ads", label: "Google Ads Offline", sub: "Sube conversión offline a Google Ads.", icon: "google", color: "#1D4ED8" },
  { cat: "anuncio", id: "retarget_list", label: "Añadir a lista retargeting", sub: "Sincroniza el email con audiencias de ads.", icon: "users", color: "#1D4ED8" },
  { cat: "anuncio", id: "lead_source_track", label: "Track de fuente", sub: "Atribuye la conversión a la campaña original.", icon: "link", color: "#1D4ED8" },

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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "#F4F7FB", borderRadius: 16, overflow: "hidden", border: "1px solid #E0E6ED" }}>
      
      {/* HEADER BITRIX STYLE */}
      <div style={{ background: "#FFF", padding: "0 24px", borderBottom: "1px solid #E0E6ED", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF" }}>
              <Ico k="refresh" size={18} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>{t("Reglas de automatización y disparadores")} <span style={{ color: "#999", fontSize: 13, fontWeight: 400 }}>{pipeline?.nombre}</span></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secundario" size="sm" style={{ fontWeight: 600 }}>EXTENSIONES</Btn>
            <Btn style={{ background: "#00B4FF", borderColor: "#00B4FF", fontWeight: 600 }} size="sm">MODO DE PRUEBA</Btn>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 30 }}>
          {[
            { id: "reglas", label: "Reglas de automatización" },
            { id: "variables", label: "Variables" },
            { id: "constantes", label: "Constantes" },
            { id: "logs", label: "Registros de la prueba" }
          ].map(m => (
            <div key={m.id} onClick={() => setTab(m.id)} style={{ padding: "12px 0", fontSize: 14, fontWeight: tab === m.id ? 700 : 500, color: tab === m.id ? T.teal : "#666", borderBottom: `2.5px solid ${tab === m.id ? T.teal : "transparent"}`, cursor: "pointer", transition: "all .2s" }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Btn size="sm" style={{ background: "#BBEB00", color: "#333", border: "none", fontWeight: 700 }}>CREAR</Btn>
          <Sel value={pipelineId} onChange={e => setPipelineId(e.target.value)} style={{ width: 180, background: "#FFF", height: 34, padding: "0 10px", color: "#333" }}>
            {db.pipelines?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Sel>
          <div style={{ position: "relative" }}>
            <Ico k="search" size={14} style={{ position: "absolute", left: 10, top: 10, color: "#999" }} />
            <Inp placeholder={t("buscar")} style={{ paddingLeft: 30, width: 240, height: 34, background: "#FFF", color: "#333" }} />
          </div>
        </div>
      </div>

      {/* STAGE BOARD */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", display: "flex", padding: "0 24px 24px" }}>
        <div style={{ display: "flex", gap: 12, height: "100%" }}>
          {etapas.map((et, idx) => (
            <div key={et.id} style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* STAGE HEADER BITRIX STYLE */}
              <div style={{ 
                background: et.color || "#DDD", 
                padding: "10px 16px", 
                color: "#FFF", 
                fontSize: 12, 
                fontWeight: 800, 
                position: "relative",
                clipPath: idx === 0 ? "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)" : "polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)",
                marginRight: -10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                minHeight: 40,
                textTransform: "uppercase",
                letterSpacing: ".02em"
              }}>
                {et.nombre}
              </div>

              {/* ADD BUTTON */}
              <div onClick={() => { setAddStageId(et.id); setShowAdd(true); }} style={{ 
                height: 34, 
                border: "1px dashed #C0C5D1", 
                borderRadius: 6, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: "#999", 
                fontSize: 20, 
                cursor: "pointer", 
                background: "rgba(255,255,255,0.7)",
                transition: "all .2s ease"
              }} onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}>
                +
              </div>

              {/* COLUMN CONTENT */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
                {reglasPorEtapa(et.id).map(r => {
                   const def = ALL_RULES.find(dr => dr.id === r.tipo) || ALL_RULES[0];
                   return (
                    <Tarjeta key={r.id} style={{ background: "#FFF", border: "1px solid #E0E6ED", padding: 12, borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                           <div style={{ fontSize: 10, color: def.type === "trigger" ? "#F59E0B" : T.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>{def.type === "trigger" ? "Disparador" : (r.config?.hora === "inmediatamente" ? "inmediatamente" : `En ${r.config?.hora}`)}</div>
                           <div style={{ fontSize: 13, fontWeight: 700, color: "#333", lineHeight: "1.2" }}>{r.nombre}</div>
                        </div>
                        <div onClick={() => setEditRule(r)} style={{ color: "#999", cursor: "pointer", paddingLeft: 8 }}><Ico k="edit" size={13} /></div>
                      </div>
                      <div style={{ fontSize: 11, color: "#999", lineHeight: "1.4", fontStyle: "italic" }}>{r.config?.sub || def.sub}</div>
                      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #F0F2F5" }}>
                         <div onClick={() => setEditRule(r)} style={{ color: "#00B4FF", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>cambiar</div>
                         <div onClick={() => handleEliminar(r.id)} style={{ color: "#FF4D4D", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>eliminar</div>
                      </div>
                    </Tarjeta>
                   );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD RULE MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Agregar regla a: ${etapas.find(e => e.id === addStageId)?.nombre}`} width={1000}>
        <div style={{ display: "flex", height: 600, margin: "-22px" }}>
          <div style={{ width: 300, background: "#F8FAFB", borderRight: "1px solid #E0E6ED", padding: "10px 0", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ padding: "10px 20px", marginBottom: 15 }}>
               <Inp value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar regla..." style={{ height: 36, fontSize: 13, background: "#FFF", color: "#333" }} />
            </div>
            {CATEGORIES.map(c => (
              <div key={c.id} onClick={() => setCatSel(c.id)} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: catSel === c.id ? "#FFF" : "transparent", color: catSel === c.id ? T.teal : "#666", borderLeft: `4px solid ${catSel === c.id ? T.teal : "transparent"}`, fontWeight: catSel === c.id ? 700 : 500, transition: "background .15s" }}>
                <div style={{ color: catSel === c.id ? T.teal : "#999" }}><Ico k={c.icon} size={16} /></div>
                <span style={{ fontSize: 13 }}>{c.label}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, padding: "30px 40px", overflowY: "auto", background: "#FFF" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {ALL_RULES.filter(r => (q ? (r.label.toLowerCase().includes(q.toLowerCase()) || r.sub.toLowerCase().includes(q.toLowerCase())) : r.cat === catSel)).map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid #F3F5F7" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                       <div style={{ color: r.color }}><Ico k={r.icon} size={16} /></div>
                       <div style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>{r.label}</div>
                    </div>
                    <div style={{ fontSize: 13, color: "#777" }}>{r.sub}</div>
                  </div>
                  <Btn onClick={() => handleAgregarRegla(r.id)} variant="secundario" size="sm" style={{ padding: "6px 16px", background: "#FFF", color: "#333", fontWeight: 700 }}>{t("Agregar")}</Btn>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* INSPECTOR MODAL */}
      <Modal open={!!editRule} onClose={() => setEditRule(null)} title={<span style={{color: '#333'}}>{editRule?.nombre}</span>} width={700}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "10px 5px", color: "#333" }}>
          
          <div style={{ display: "flex", gap: 20, paddingBottom: 20, borderBottom: "1px solid #F0F2F5" }}>
            <div style={{ flex: 1 }}>
               <BitrixSelect 
                  label="Ejecución" 
                  value={editRule?.config?.ejecucion || "paralelo"} 
                  options={[{id: "paralelo", label: "En paralelo"}, {id: "secuencial", label: "Secuencial"}]}
                  onChange={v => setEditRule({...editRule, config: {...editRule.config, ejecucion: v}})}
               />
            </div>
            <div style={{ flex: 1 }}>
               <BitrixSelect 
                  label="Hora" 
                  value={editRule?.config?.hora || "inmediatamente"} 
                  options={[{id: "inmediatamente", label: "Inmediatamente"}, {id: "1h", label: "En 1 hora"}, {id: "1d", label: "En 1 día"}]}
                  onChange={v => setEditRule({...editRule, config: {...editRule.config, hora: v}})}
               />
            </div>
          </div>

          {/* CONDITIONS EDITOR */}
          <div>
             <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 12 }}>Condición</div>
             <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editRule?.config?.condiciones?.map((cond, i) => (
                   <div key={cond.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#F8FAFB", padding: 10, borderRadius: 6, border: "1px solid #E0E6ED" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#666", width: 120 }}>{cond.label}</div>
                      <BitrixSelect 
                        value={cond.op} 
                        options={OPERATORS}
                        onChange={v => {
                           const newConds = [...editRule.config.condiciones];
                           newConds[i].op = v;
                           setEditRule({...editRule, config: {...editRule.config, condiciones: newConds}});
                        }}
                      />
                      <Inp 
                         value={cond.val} 
                         onChange={e => {
                            const newConds = [...editRule.config.condiciones];
                            newConds[i].val = e.target.value;
                            setEditRule({...editRule, config: {...editRule.config, condiciones: newConds}});
                         }}
                         placeholder="valor..."
                         style={{ flex: 1, background: "#FFF", height: 28, fontSize: 12, border: "1px solid #DDD" }}
                      />
                      <div onClick={() => {
                         const newConds = editRule.config.condiciones.filter(c => c.id !== cond.id);
                         setEditRule({...editRule, config: {...editRule.config, condiciones: newConds}});
                      }} style={{ color: "#FF4D4D", cursor: "pointer" }}><Ico k="trash" size={14} /></div>
                   </div>
                ))}
                <span onClick={() => setShowFieldMenu("condicion")} style={{ color: "#00B4FF", fontSize: 13, cursor: "pointer", borderBottom: "1px dashed #00B4FF", width: "fit-content" }}>+ Agregar condición</span>
             </div>
          </div>

          {/* SPECIFIC FIELDS PER RULE TYPE */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, borderTop: "1px solid #F0F2F5", paddingTop: 20 }}>
            
            {/* NOTIFICATIONS / COMMUNICATION */}
            {(editRule?.tipo.includes("enviar") || editRule?.tipo === "notif_user" || editRule?.tipo === "send_chat_msg" || editRule?.tipo === "add_comment" || editRule?.tipo.includes("msg") || editRule?.tipo.includes("notif")) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Contenido de la notificación</div>
                {editRule.tipo.includes("email") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#999" }}>Asunto:</div>
                    <Inp value={editRule.config?.asunto} onChange={e => setEditRule({...editRule, config: {...editRule.config, asunto: e.target.value}})} style={{ background: "#FFF", color: "#333", border: "1px solid #DDD" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#999" }}>Mensaje:</div>
                  <textarea 
                    value={editRule.config?.mensaje} 
                    onChange={e => setEditRule({...editRule, config: {...editRule.config, mensaje: e.target.value}})}
                    style={{ width: "100%", height: 100, borderRadius: 6, border: "1px solid #DDD", padding: 12, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none" }}
                    placeholder="Escribe el mensaje aquí... usa {nombre} para variables"
                  />
                </div>
                <BitrixSelect 
                    label="Destinatario"
                    value={editRule.config?.destinatario || "responsable"}
                    options={[{id: "responsable", label: "Persona responsable"}, {id: "cliente", label: "Cliente (Contacto/Empresa)"}, {id: "todos", label: "Todos los involucrados"}]}
                    onChange={v => setEditRule({...editRule, config: {...editRule.config, destinatario: v}})}
                />
              </div>
            )}

            {/* CHANGE STAGE */}
            {(editRule?.tipo === "change_stage") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Mover a la etapa</div>
                <BitrixSelect 
                    label="Seleccionar etapa de destino"
                    value={editRule.config?.etapa_destino || ""}
                    options={etapas.map(e => ({ id: e.id, label: e.nombre }))}
                    onChange={v => setEditRule({...editRule, config: {...editRule.config, etapa_destino: v}})}
                />
              </div>
            )}

            {/* CHANGE RESPONSIBLE */}
            {(editRule?.tipo === "change_resp") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Nueva persona responsable</div>
                <BitrixSelect 
                    label="Seleccionar empleado"
                    value={editRule.config?.responsable_id || ""}
                    options={usuarios.map(u => ({ id: u.id, label: u.name || u.email }))}
                    onChange={v => setEditRule({...editRule, config: {...editRule.config, responsable_id: v}})}
                />
              </div>
            )}

            {/* CREATE TASK */}
            {(editRule?.tipo === "create_task") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Detalles de la tarea</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#999" }}>Título:</div>
                  <Inp value={editRule.config?.titulo_tarea} onChange={e => setEditRule({...editRule, config: {...editRule.config, titulo_tarea: e.target.value}})} style={{ background: "#FFF", color: "#333", border: "1px solid #DDD" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#999" }}>Descripción:</div>
                  <textarea 
                    value={editRule.config?.desc_tarea} 
                    onChange={e => setEditRule({...editRule, config: {...editRule.config, desc_tarea: e.target.value}})}
                    style={{ width: "100%", height: 80, borderRadius: 6, border: "1px solid #DDD", padding: 12, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none" }}
                    placeholder="Descripción de la tarea..."
                  />
                </div>
              </div>
            )}

            {/* MODIFICATIONS / CUSTOM FIELDS */}
            {(editRule?.tipo === "mod_item" || editRule?.tipo === "upd_contact" || editRule?.tipo === "upd_company") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Campos a modificar</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {editRule.config?.campos?.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: "#666" }}>{f.label}</div>
                        <Inp 
                            value={f.value} 
                            onChange={e => {
                              const newCampos = [...editRule.config.campos];
                              newCampos[i].value = e.target.value;
                              setEditRule({...editRule, config: {...editRule.config, campos: newCampos}});
                            }}
                            style={{ flex: 1, background: "#FFF", color: "#333", height: 32, border: "1px solid #DDD" }} 
                        />
                        <div style={{ color: "#FF4D4D", cursor: "pointer" }} onClick={() => {
                            const newCampos = editRule.config.campos.filter((_, idx) => idx !== i);
                            setEditRule({...editRule, config: {...editRule.config, campos: newCampos}});
                        }}><Ico k="trash" size={14} /></div>
                      </div>
                    ))}
                    <span onClick={() => setShowFieldMenu("campos")} style={{ color: "#00B4FF", fontSize: 13, cursor: "pointer", borderBottom: "1px dashed #00B4FF", width: "fit-content" }}>+ Seleccionar campo</span>
                </div>
              </div>
            )}

          </div>

          {/* FIELD SELECTOR OVERLAY (DYNAMIC) */}
          {showFieldMenu && (
            <>
              <div onClick={() => setShowFieldMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
              <div style={{ position: "fixed", top: "20%", left: "30%", right: "30%", background: "#FFF", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", borderRadius: 12, zIndex: 9999, border: "1px solid #DDD", maxHeight: "60vh", overflowY: "auto" }}>
                 <div style={{ padding: 15, borderBottom: "1px solid #EEE", fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
                    Seleccionar campo de CRM
                    <span onClick={() => setShowFieldMenu(false)} style={{ cursor: "pointer" }}><Ico k="x" size={14} /></span>
                 </div>
                 <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 8, padding: "0 10px", fontWeight: 800 }}>CAMPOS DISPONIBLES (ESTÁNDAR + PERSONALIZADOS)</div>
                    {crmFields.map(f => (
                      <div key={f.id} onClick={() => addFieldToRule(f)} style={{ padding: "10px 15px", fontSize: 13, cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = "#F5F9FF"}>
                          {f.label} <span style={{ fontSize: 11, color: "#999" }}>({f.type})</span>
                      </div>
                    ))}
                 </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 12, borderTop: "1px solid #F0F2F5", paddingTop: 24 }}>
             <Btn onClick={() => handleUpdateRule(editRule)} style={{ background: "#BBEB00", color: "#333", border: "none", padding: "10px 30px", fontSize: 13, fontWeight: 700, borderRadius: 4 }}>GUARDAR</Btn>
             <Btn variant="secundario" onClick={() => setEditRule(null)} style={{ padding: "10px 30px", fontSize: 13, fontWeight: 700, borderRadius: 4, background: "#FFF", color: "#666", border: "1px solid #DDD" }}>CANCELAR</Btn>
          </div>

        </div>
      </Modal>

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; borderRadius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        
        select option {
           background: #FFF !important;
           color: #333 !important;
        }
      `}</style>
    </div>
  );
};
