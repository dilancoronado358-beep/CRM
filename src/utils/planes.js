export const PLAN_LIMITS = {
  estandar: {
    whatsapp: 2,
    emails: 1, // por usuario
    plantillas: 10,
    qualifi: false,
    landing_pages: 2,
    usuarios: 10,
    formularios: 10,
    contactos: 500,
    pipelines: 2
  },
  premium: {
    whatsapp: 4,
    emails: 2, // por usuario
    plantillas: 20,
    qualifi: true,
    landing_pages: 4,
    usuarios: 20,
    formularios: 20,
    contactos: 2000,
    pipelines: 4
  },
  business: {
    whatsapp: Infinity,
    emails: Infinity,
    plantillas: Infinity,
    qualifi: true,
    landing_pages: Infinity,
    usuarios: Infinity,
    formularios: Infinity,
    contactos: Infinity,
    pipelines: Infinity
  }
};

/** Metadatos de planes para mostrar en la UI de suscripción */
export const PLAN_META = {
  estandar: {
    id: "estandar",
    nombre: "Estándar",
    precio: 79,
    descripcion: "Perfecto para equipos pequeños que empiezan a escalar sus ventas.",
    color: "#60A5FA",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 100%)",
    badge: null,
    features: [
      { icon: "users", text: "Hasta 10 usuarios" },
      { icon: "phone", text: "2 canales WhatsApp" },
      { icon: "funnel", text: "2 pipelines de ventas" },
      { icon: "user", text: "500 contactos" },
      { icon: "template", text: "10 plantillas de email" },
      { icon: "note", text: "10 formularios" },
      { icon: "layers", text: "2 landing pages" },
      { icon: "mail", text: "1 cuenta de correo" },
      { icon: "x", text: "Ensing AI", disabled: true },
    ]
  },
  premium: {
    id: "premium",
    nombre: "Premium",
    precio: 200,
    descripcion: "Para equipos en crecimiento que necesitan más potencia y automatización.",
    color: "#A78BFA",
    gradient: "linear-gradient(135deg, #3b1f6e 0%, #2d1a5a 100%)",
    badge: "⚡ Más Popular",
    features: [
      { icon: "users", text: "Hasta 20 usuarios" },
      { icon: "phone", text: "4 canales WhatsApp" },
      { icon: "funnel", text: "4 pipelines de ventas" },
      { icon: "user", text: "2,000 contactos" },
      { icon: "template", text: "20 plantillas de email" },
      { icon: "note", text: "20 formularios" },
      { icon: "layers", text: "4 landing pages" },
      { icon: "mail", text: "2 cuentas de correo" },
      { icon: "check", text: "Ensing AI Copilot" },
    ]
  },
  business: {
    id: "business",
    nombre: "Business",
    precio: 375,
    descripcion: "Sin límites. Para empresas que requieren escala total y soporte prioritario.",
    color: "#10B981",
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    badge: "🏆 Enterprise",
    features: [
      { icon: "users", text: "Usuarios ilimitados" },
      { icon: "phone", text: "WhatsApp ilimitados" },
      { icon: "funnel", text: "Pipelines ilimitados" },
      { icon: "user", text: "Contactos ilimitados" },
      { icon: "template", text: "Plantillas ilimitadas" },
      { icon: "note", text: "Formularios ilimitados" },
      { icon: "layers", text: "Landing pages ilimitadas" },
      { icon: "mail", text: "Correos ilimitados" },
      { icon: "check", text: "Ensing AI Copilot" },
    ]
  }
};

/**
 * Obtiene los conteos actuales de uso de recursos para una organización.
 */
export const getUsageStats = (db) => {
  if (!db || !db.usuario) return {};
  const orgId = db.usuario.org_id;
  const org = (db.organizacion || []).find(o => o.id === orgId);
  const planId = org?.plan || "estandar";
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS.estandar;

  return {
    usuarios:      { actual: (db.usuariosApp || []).filter(u => u.org_id === orgId).length,          limite: limits.usuarios },
    whatsapp:      { actual: (db.whatsapp_accounts || []).filter(a => a.org_id === orgId || !a.org_id).length, limite: limits.whatsapp },
    contactos:     { actual: (db.contactos || []).filter(x => x.org_id === orgId).length,            limite: limits.contactos },
    pipelines:     { actual: (db.pipelines || []).filter(x => x.org_id === orgId).length,            limite: limits.pipelines },
    plantillas:    { actual: (db.plantillasEmail || []).filter(x => x.org_id === orgId).length,      limite: limits.plantillas },
    landing_pages: { actual: (db.landing_pages || []).filter(x => x.org_id === orgId).length,        limite: limits.landing_pages },
    formularios:   { actual: (db.formularios_publicos || []).filter(x => x.org_id === orgId).length, limite: limits.formularios },
    emails:        { actual: (db.email_accounts || []).filter(e => e.user_id === db.usuario?.id).length, limite: limits.emails },
  };
};

/**
 * Función centralizada para verificar si una organización ha excedido el límite de un recurso.
 * @param {Object} db - La base de datos local completa (estado global).
 * @param {String} resource - El recurso a validar (whatsapp, emails, usuarios, pipelines, contactos, etc.)
 * @param {Number} currentCount - (Opcional) La cantidad actual de ese recurso. Si no se pasa, la función lo calculará automáticamente desde la `db`.
 * @returns {Boolean} true si se permite la creación, false si superó el límite.
 */
export const checkPlanLimit = (db, resource, currentCount = null) => {
  if (!db || !db.usuario) return true; // Si no hay estado, permitir (fallback)

  const orgId = db.usuario.org_id;
  // El SuperAdmin ("principal") siempre es ilimitado por defecto
  if (orgId === '00000000-0000-0000-0000-000000000001') return true;

  const org = (db.organizacion || []).find(o => o.id === orgId);
  if (!org) return true; // Fallback
  
  const planId = org.plan || "estandar"; // Default a estandar
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS.estandar;
  
  const limit = limits[resource];
  if (limit === Infinity) return true;
  if (limit === false) return false;
  if (limit === true) return true;

  // Calculamos el count actual si no se proveyó
  let count = currentCount;
  if (count === null) {
    switch (resource) {
      case "whatsapp":
        count = (db.whatsapp_accounts || []).filter(a => a.org_id === orgId || !a.org_id).length;
        break;
      case "usuarios":
        count = (db.usuariosApp || []).filter(u => u.org_id === orgId).length;
        break;
      case "pipelines":
        count = (db.pipelines || []).filter(x => x.org_id === orgId).length;
        break;
      case "contactos":
        count = (db.contactos || []).filter(x => x.org_id === orgId).length;
        break;
      case "plantillas":
        count = (db.plantillasEmail || []).filter(x => x.org_id === orgId).length;
        break;
      case "landing_pages":
        count = (db.landing_pages || []).filter(x => x.org_id === orgId).length;
        break;
      case "formularios":
        count = (db.formularios_publicos || []).filter(x => x.org_id === orgId).length;
        break;
      case "emails":
        // Esto es "por usuario". Entonces calculamos cuántos emails tiene el usuario actual
        count = (db.email_accounts || []).filter(e => e.user_id === db.usuario.id).length;
        break;
      default:
        count = 0;
    }
  }

  return count < limit;
};

export const getPlanLimitError = (resource) => {
  return `Has alcanzado el límite de ${resource} permitidos en tu plan actual. Por favor, contacta con soporte para hacer upgrade a un plan superior.`;
};
