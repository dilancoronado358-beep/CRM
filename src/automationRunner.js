import { uid, uuid } from "./utils";

/**
 * EVALUADOR DE CONDICIONES
 */
const matchCondition = (fieldValue, operator, targetValue) => {
  const fv = String(fieldValue || "").toLowerCase();
  const tv = String(targetValue || "").toLowerCase();

  switch (operator) {
    case "==": return fv === tv;
    case "!=": return fv !== tv;
    case "contiene": return fv.includes(tv);
    case "no_contiene": return !fv.includes(tv);
    case ">": return Number(fieldValue) > Number(targetValue);
    case "<": return Number(fieldValue) < Number(targetValue);
    case "set": return !!fieldValue;
    case "not_set": return !fieldValue;
    default: return true;
  }
};

/**
 * REEMPLAZO DE VARIABLES EN TEXTO
 */
const replaceVars = (text, deal) => {
  if (!text) return "";
  return text
    .replace(/{titulo}/g, deal.titulo || "")
    .replace(/{nombre}/g, deal.titulo || "")
    .replace(/{monto}/g, deal.valor || "0")
    .replace(/{valor}/g, deal.valor || "0")
    .replace(/{responsable}/g, deal.responsable || "");
};

/**
 * MOTOR DE AUTOMATIZACIÓN (Automation Runner)
 */
export const executeRules = async (db, deal, stageId, { guardarEnSupa }) => {
  // Filtrar reglas activas para este pipeline y esta etapa específica
  const rules = (db.automatizaciones || []).filter(r => 
    r.activo && 
    r.pipeline_id === deal.pipeline_id && 
    r.etapa_id === stageId
  );

  if (rules.length === 0) return;

  console.log(`[AutomationRunner] Procesando ${rules.length} reglas para el negocio "${deal.titulo}" en etapa "${stageId}"`);

  for (const rule of rules) {
    // 1. Verificar condiciones de la regla
    const conditions = rule.config?.condiciones || [];
    const allMatch = conditions.every(c => {
      // Intentar obtener del objeto raíz (titulo, valor, etc) o campos personalizados
      const val = deal[c.fieldId] !== undefined ? deal[c.fieldId] : (deal.custom_fields?.[c.fieldId]);
      return matchCondition(val, c.op, c.val);
    });

    if (!allMatch && conditions.length > 0) {
      console.log(`[AutomationRunner] Regla "${rule.nombre}" saltada por condiciones no cumplidas.`);
      continue;
    }

    console.log(`[AutomationRunner] Ejecutando acción: ${rule.nombre} (${rule.tipo})`);

    // 2. Ejecutar la acción configurada
    try {
      switch (rule.tipo) {
        case "change_stage":
          if (rule.config?.etapa_destino && rule.config.etapa_destino !== stageId) {
             console.log(`[AutomationRunner] Moviendo negocio a etapa: ${rule.config.etapa_destino}`);
             await guardarEnSupa("deals", { ...deal, etapa_id: rule.config.etapa_destino });
          }
          break;

        case "change_resp":
          if (rule.config?.responsable_id) {
            const user = db.usuariosApp?.find(u => u.id === rule.config.responsable_id);
            if (user) {
              console.log(`[AutomationRunner] Cambiando responsable a: ${user.name}`);
              await guardarEnSupa("deals", { ...deal, responsable: user.name });
            }
          }
          break;

        case "create_task":
          console.log(`[AutomationRunner] Creando tarea...`);
          const task = {
            id: "t" + uid(),
            titulo: replaceVars(rule.config?.titulo_tarea || "Tarea automática", deal),
            descripcion: replaceVars(rule.config?.desc_tarea || "", deal),
            prioridad: "media",
            estado: "pendiente",
            asignado: deal.responsable,
            vencimiento: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            contacto_id: deal.contacto_id,
            deal_id: deal.id,
            org_id: deal.org_id,
            creado: new Date().toISOString()
          };
          await guardarEnSupa("tareas", task);
          break;

        case "notif_user":
          console.log(`[AutomationRunner] Enviando notificación...`);
          const noti = {
            id: uuid(), 
            usuario_id: db.usuario?.id, 
            titulo: replaceVars(rule.config?.asunto || "Notificación de CRM", deal),
            mensaje: replaceVars(rule.config?.mensaje || rule.nombre, deal),
            tipo: "info",
            url: "pipeline",
            leida: false,
            org_id: deal.org_id,
            creado: new Date().toISOString()
          };
          await guardarEnSupa("notificaciones", noti);
          break;

        case "add_comment":
          console.log(`[AutomationRunner] Agregando comentario...`);
          const comment = {
            id: "a" + uid(),
            tipo: "tarea",
            titulo: "Automatización",
            notas: replaceVars(rule.config?.mensaje || "Acción realizada por regla automática", deal),
            dealId: deal.id,
            contactoId: deal.contacto_id,
            responsable: "Sistema",
            fecha: new Date().toISOString(),
            hecho: true,
            org_id: deal.org_id
          };
          await guardarEnSupa("actividades", comment);
          break;

        case "mod_item":
          console.log(`[AutomationRunner] Modificando campos del negocio...`);
          const updatedFields = {};
          (rule.config?.campos || []).forEach(f => {
            updatedFields[f.id] = replaceVars(f.value, deal);
          });
          if (Object.keys(updatedFields).length > 0) {
            await guardarEnSupa("deals", { ...deal, ...updatedFields });
          }
          break;

        default:
          console.warn(`[AutomationRunner] Tipo de regla "${rule.tipo}" aún no tiene ejecutor dinámico.`);
      }
    } catch (err) {
      console.error(`[AutomationRunner] Error crítico ejecutando regla ${rule.id}:`, err);
    }
  }
};
