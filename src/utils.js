import { T } from "./theme";

// Generador de ID aleatorio persistente
export const uid = () => Math.random().toString(36).substr(2, 9);

// Generador de UUID para base de datos
export const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export const money = v => new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);

export const fdate = d => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

export const fdtm = d => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("es-MX", { month: "short", day: "2-digit" }) + " " + dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

export const ESTADO_CFG = {
  cliente: { label: "Cliente", color: T.green, bg: T.greenS },
  lead: { label: "Lead", color: T.teal, bg: T.tealSoft },
  prospecto: { label: "Prospecto", color: T.amber, bg: T.amberS },
  inactivo: { label: "Inactivo", color: T.whiteDim, bg: "rgba(107,130,153,0.12)" },
};

export const PRIO_CFG = {
  alta: { label: "Alta", color: T.red, bg: T.redS },
  media: { label: "Media", color: T.amber, bg: T.amberS },
  baja: { label: "Baja", color: T.green, bg: T.greenS },
};

export const ACT_CFG = {
  llamada: { label: "Llamada", color: T.teal, icon: "📞" },
  reunion: { label: "Reunión", color: "#A78BFA", icon: "📅" },
  email: { label: "Email", color: T.amber, icon: "✉️" },
  tarea: { label: "Tarea", color: T.green, icon: "✅" },
};

export const TPL_CATS = {
  prospectacion: { label: "Prospección", color: T.teal },
  seguimiento: { label: "Seguimiento", color: "#60A5FA" },
  propuesta: { label: "Propuesta", color: T.amber },
  reactivacion: { label: "Reactivación", color: "#A78BFA" },
  cierre: { label: "Cierre", color: T.green },
};

/**
 * Centrally calculates the backend API/Socket URL based on organization context.
 */
export const getApiUrl = (db) => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // 1. Current Org URL (Primary source)
  const orgActual = db?.organizacion?.find(o => o.id === db.usuario?.org_id);
  if (orgActual?.wa_server_url) return orgActual.wa_server_url;

  // 2. Master Org (ENSING) - Global Fallback
  const masterOrg = db?.organizacion?.find(o => o.id === '00000000-0000-0000-0000-000000000001');
  if (masterOrg?.wa_server_url) return masterOrg.wa_server_url;

  // 3. Admin user waServerUrl (Legacy backward compatibility)
  const adminWithUrl = db?.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl);
  if (adminWithUrl?.waServerUrl) return adminWithUrl.waServerUrl;

  // 4. Local Development Fallback
  return `${protocol}//${hostname}:3001`;
};
