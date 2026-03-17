import { T } from "../theme";

export const SEMILLA = {
  usuario: { name: "Alejandro Vega", email: "alejandro@miempresa.com", role: "admin", avatar: "AV" },
  empresaConfigs: {
    nombre: "Mi Empresa Corp.",
    apiKey: "sk_dev_1234567890abcdef",
    webhooks: [
      { id: "wh1", url: "https://hook.make.com/xyz123", evento: "deal.ganado", activo: true }
    ]
  },
  usuariosApp: [
    { id: "u1", name: "Administrador ENSING", email: "admin@ensing.lat", role: "admin", avatar: "AD", activo: true, area: "Sistemas" },
    { id: "u2", name: "María López", email: "maria@miempresa.com", role: "manager", avatar: "ML", activo: true, area: "Ventas B2B" },
    { id: "u3", name: "Carlos Ruiz", email: "carlos@miempresa.com", role: "ventas", avatar: "CR", activo: true, area: "Ventas SMB" },
  ],
  cuentaEmail: { 
    conectado: false, 
    proveedor: "personalizado", 
    direccion: "", 
    smtpHost: "smtp.mailgun.org", 
    smtpPort: "587", 
    smtpUser: "", 
    smtpPass: "",
    imapHost: "imap.mailgun.org",
    imapPort: "993"
  },
  productos: [
    { id: "p1", sku: "SaaS-ENT-Y", nombre: "Licencia Enterprise Anual", descripcion: "Hasta 50 usuarios, SLA 99.9%, Soporte 24/7", precio: 12000, categoria: "Suscripción", activo: true },
    { id: "p2", sku: "SaaS-PRO-M", nombre: "Licencia Pro Mensual", descripcion: "Hasta 10 usuarios, Soporte estándar", precio: 150, categoria: "Suscripción", activo: true },
    { id: "p3", sku: "SRV-IMPL", nombre: "Setup e Implementación", descripcion: "Paquete de 40h de configuración inicial", precio: 3500, categoria: "Servicio", activo: true },
    { id: "p4", sku: "SRV-TRAIN", nombre: "Capacitación de Equipo", descripcion: "Sesión remota de 4h para el equipo de ventas", precio: 800, categoria: "Servicio", activo: true },
  ],
  contactos: [
    { id: "c1", nombre: "Sofía Martín", email: "sofia@techflow.es", telefono: "+52 55 1234 0001", empresa: "TechFlow SL", cargo: "CEO", estado: "cliente", etiquetas: ["vip", "saas"], valor: 84000, avatar: "SM", color: T.teal, creado: "2024-01-10", ultimo_contacto: "2024-03-14", score: 92, fuente: "Referido", notas: "Interesada en expansión." },
    { id: "c2", nombre: "Carlos Reyes", email: "carlos@innolab.io", telefono: "+52 55 1234 0002", empresa: "InnoLab", cargo: "CTO", estado: "lead", etiquetas: ["tech", "startup"], valor: 28000, avatar: "CR", color: T.green, creado: "2024-02-15", ultimo_contacto: "2024-03-12", score: 74, fuente: "LinkedIn", notas: "Evaluando plan enterprise." },
    { id: "c3", nombre: "Laura Pérez", email: "laura@globalretail.mx", telefono: "+52 55 1234 0003", empresa: "Global Retail", cargo: "Dir. Ventas", estado: "prospecto", etiquetas: ["retail"], valor: 52000, avatar: "LP", color: T.amber, creado: "2024-02-28", ultimo_contacto: "2024-03-10", score: 61, fuente: "Web", notas: "Demo pendiente." },
    { id: "c4", nombre: "Marcos Jiménez", email: "marcos@consult.pro", telefono: "+52 55 1234 0004", empresa: "Consult Pro", cargo: "Socio", estado: "cliente", etiquetas: ["vip"], valor: 120000, avatar: "MJ", color: "#A78BFA", creado: "2023-11-05", ultimo_contacto: "2024-03-13", score: 98, fuente: "Evento", notas: "Contrato marco 3 años." },
    { id: "c5", nombre: "Elena Torres", email: "elena@designhub.co", telefono: "+52 55 1234 0005", empresa: "DesignHub", cargo: "Fundadora", estado: "inactivo", etiquetas: ["diseño"], valor: 9500, avatar: "ET", color: "#F472B6", creado: "2023-08-20", ultimo_contacto: "2024-01-05", score: 32, fuente: "Email", notas: "Sin respuesta desde enero." },
    { id: "c6", nombre: "Javier Soto", email: "javier@cloudsync.net", telefono: "+52 55 1234 0006", empresa: "CloudSync", cargo: "VP Ventas", estado: "lead", etiquetas: ["cloud", "saas"], valor: 47000, avatar: "JS", color: "#60A5FA", creado: "2024-03-01", ultimo_contacto: "2024-03-15", score: 68, fuente: "Llamada fría", notas: "Muy interesado." },
  ],
  empresas: [
    { id: "co1", nombre: "TechFlow SL", industria: "SaaS", tamaño: "51-200", sitio: "techflow.es", ingresos: "$5M-10M", ciudad: "CDMX", logo: "TF", color: T.teal, contactos: ["c1"], deals: ["d1", "d2"] },
    { id: "co2", nombre: "InnoLab", industria: "Startup", tamaño: "11-50", sitio: "innolab.io", ingresos: "$1M-5M", ciudad: "Guadalajara", logo: "IL", color: T.green, contactos: ["c2"], deals: ["d3"] },
    { id: "co3", nombre: "Global Retail", industria: "Retail", tamaño: "201-500", sitio: "globalretail.mx", ingresos: "$20M-50M", ciudad: "Monterrey", logo: "GR", color: T.amber, contactos: ["c3"], deals: ["d4"] },
    { id: "co4", nombre: "Consult Pro", industria: "Consultoría", tamaño: "11-50", sitio: "consult.pro", ingresos: "$2M-5M", ciudad: "Puebla", logo: "CP", color: "#A78BFA", contactos: ["c4"], deals: ["d5", "d6"] },
    { id: "co5", nombre: "DesignHub", industria: "Diseño", tamaño: "1-10", sitio: "designhub.co", ingresos: "<$500K", ciudad: "Querétaro", logo: "DH", color: "#F472B6", contactos: ["c5"], deals: [] },
    { id: "co6", nombre: "CloudSync", industria: "Cloud", tamaño: "51-200", sitio: "cloudsync.net", ingresos: "$5M-10M", ciudad: "León", logo: "CS", color: "#60A5FA", contactos: ["c6"], deals: ["d7"] },
  ],
  pipelines: [
    {
      id: "pl1", nombre: "Ventas B2B", color: T.teal, es_principal: true, etapas: [
        { id: "et1", nombre: "Nuevo Lead", color: T.whiteDim, orden: 0, probabilidad: 10 },
        { id: "et2", nombre: "Calificado", color: "#60A5FA", orden: 1, probabilidad: 25 },
        { id: "et3", nombre: "Propuesta Enviada", color: "#A78BFA", orden: 2, probabilidad: 50 },
        { id: "et4", nombre: "Negociación", color: T.amber, orden: 3, probabilidad: 75 },
        { id: "et5", nombre: "Ganado", color: T.green, orden: 4, probabilidad: 100, es_ganado: true },
        { id: "et6", nombre: "Perdido", color: T.red, orden: 5, probabilidad: 0, es_perdido: true },
      ]
    },
    {
      id: "pl2", nombre: "Renovaciones", color: T.green, es_principal: false, etapas: [
        { id: "er1", nombre: "Por Renovar", color: T.whiteDim, orden: 0, probabilidad: 60 },
        { id: "er2", nombre: "En Contacto", color: "#60A5FA", orden: 1, probabilidad: 70 },
        { id: "er3", nombre: "Negociando", color: T.amber, orden: 2, probabilidad: 85 },
        { id: "er4", nombre: "Renovado", color: T.green, orden: 3, probabilidad: 100, es_ganado: true },
        { id: "er5", nombre: "Cancelado", color: T.red, orden: 4, probabilidad: 0, es_perdido: true },
      ]
    },
  ],
  deals: [
    { id: "d1", titulo: "TechFlow — Plan Enterprise", contacto_id: "c1", empresa_id: "co1", pipeline_id: "pl1", etapa_id: "et4", valor: 84000, prob: 75, fecha_cierre: "2024-04-30", responsable: "Alejandro Vega", creado: "2024-01-15", etiquetas: ["prioritario"], notas: "Negociando cláusulas SLA.", custom_fields: {} },
    { id: "d2", titulo: "TechFlow — Módulo Analytics", contacto_id: "c1", empresa_id: "co1", pipeline_id: "pl1", etapa_id: "et3", valor: 18000, prob: 50, fecha_cierre: "2024-05-15", responsable: "María López", creado: "2024-02-10", etiquetas: [], notas: "Esperando feedback propuesta.", custom_fields: {} },
    { id: "d3", titulo: "InnoLab — Plan Growth", contacto_id: "c2", empresa_id: "co2", pipeline_id: "pl1", etapa_id: "et2", valor: 28000, prob: 25, fecha_cierre: "2024-06-01", responsable: "Alejandro Vega", creado: "2024-02-20", etiquetas: ["nuevo"], notas: "Primer contacto positivo.", custom_fields: {} },
    { id: "d4", titulo: "Global Retail — Omnicanal", contacto_id: "c3", empresa_id: "co3", pipeline_id: "pl1", etapa_id: "et1", valor: 52000, prob: 10, fecha_cierre: "2024-07-01", responsable: "María López", creado: "2024-03-05", etiquetas: [], notas: "Iniciando calificación.", custom_fields: {} },
    { id: "d5", titulo: "Consult Pro — Q2 Estrategia", contacto_id: "c4", empresa_id: "co4", pipeline_id: "pl1", etapa_id: "et5", valor: 38000, prob: 100, fecha_cierre: "2024-03-31", responsable: "Alejandro Vega", creado: "2023-12-01", etiquetas: ["ganado"], notas: "Cerrado. Kick-off 3 Abril.", custom_fields: {} },
    { id: "d6", titulo: "Consult Pro — Soporte Anual", contacto_id: "c4", empresa_id: "co4", pipeline_id: "pl2", etapa_id: "er4", valor: 12000, prob: 100, fecha_cierre: "2024-01-31", responsable: "María López", creado: "2023-11-15", etiquetas: [], notas: "Renovado automáticamente.", custom_fields: {} },
    { id: "d7", titulo: "CloudSync — Integración API", contacto_id: "c6", empresa_id: "co6", pipeline_id: "pl1", etapa_id: "et2", valor: 47000, prob: 25, fecha_cierre: "2024-06-15", responsable: "Alejandro Vega", creado: "2024-03-05", etiquetas: ["nuevo"], notas: "Demo agendada.", custom_fields: {} },
  ],
  actividades: [
    { id: "a1", tipo: "llamada", titulo: "Seguimiento TechFlow", contacto_id: "c1", deal_id: "d1", fecha: "2024-03-14 10:00", duracion: 45, hecho: true, responsable: "Alejandro Vega", notas: "Confirman interés. Enviar borrador contrato." },
    { id: "a2", tipo: "reunion", titulo: "Demo producto CloudSync", contacto_id: "c6", deal_id: "d7", fecha: "2024-03-18 16:00", duracion: 60, hecho: false, responsable: "Alejandro Vega", notas: "Preparar deck personalizado." },
    { id: "a3", tipo: "email", titulo: "Propuesta enviada InnoLab", contacto_id: "c2", deal_id: "d3", fecha: "2024-03-12 09:30", duracion: 0, hecho: true, responsable: "María López", notas: "Adjuntar casos de éxito." },
    { id: "a4", tipo: "tarea", titulo: "Preparar contrato Consult Pro", contacto_id: "c4", deal_id: "d5", fecha: "2024-03-20 12:00", duracion: 0, hecho: false, responsable: "Alejandro Vega", notas: "Incluir cláusulas revisadas." },
  ],
  tareas: [
    { id: "t1", titulo: "Revisar propuesta TechFlow", prioridad: "alta", estado: "pendiente", asignado: "Alejandro Vega", vencimiento: "2024-03-20", contacto_id: "c1", deal_id: "d1", descripcion: "Ajustar precios según feedback." },
    { id: "t2", titulo: "Demo con CloudSync", prioridad: "alta", estado: "en_progreso", asignado: "Alejandro Vega", vencimiento: "2024-03-18", contacto_id: "c6", deal_id: "d7", descripcion: "Preparar demo módulo API." },
    { id: "t3", titulo: "Seguimiento InnoLab", prioridad: "media", estado: "pendiente", asignado: "María López", vencimiento: "2024-03-19", contacto_id: "c2", deal_id: "d3", descripcion: "Enviar casos de éxito similares." },
    { id: "t4", titulo: "Informe pipeline mensual", prioridad: "baja", estado: "pendiente", asignado: "María López", vencimiento: "2024-03-31", contacto_id: null, deal_id: null, descripcion: "Compilar métricas de Marzo." },
    { id: "t5", titulo: "Contrato Consult Pro — Firma", prioridad: "alta", estado: "completado", asignado: "Alejandro Vega", vencimiento: "2024-03-10", contacto_id: "c4", deal_id: "d5", descripcion: "Enviar para firma digital." },
  ],
  emails: [
    { id: "e1", carpeta: "entrada", de: "sofia@techflow.es", para: "alejandro@miempresa.com", asunto: "Re: Propuesta Enterprise 2024", cuerpo: "Hola Alejandro,\n\nHemos revisado la propuesta internamente y estamos de acuerdo con los términos principales.\n\nSaludos,\nSofía", fecha: "2024-03-14 11:23", leido: true, contacto_id: "c1" },
  ],
  plantillasEmail: [],
  notas: [
    { id: "n1", contacto_id: "c1", deal_id: "d1", texto: "Llamada muy positiva. CEO comprometida. Enviar contrato cuanto antes.", autor: "Alejandro Vega", fecha: "2024-03-14 10:45", fijada: true },
  ],
  campos_personalizados: [],
  api_settings: [],
  webhook_subscriptions: [],
};
