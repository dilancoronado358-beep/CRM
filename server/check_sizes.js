
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const TABLAS = [
  "contactos", "empresas", "deals", "actividades", "tareas", "emails", "notas",
  "usuario", "empresaConfigs", "usuariosApp", "productos",
  "pipelines", "plantillasEmail", "campos_personalizados", "automatizaciones",
  "whatsapp_automations", "whatsapp_messages", "finanzas_gastos", "finanzas_comisiones",
  "notificaciones", "auditoria", "api_settings", "webhook_subscriptions",
  "email_accounts", "landing_pages", "formularios_publicos", "organizacion"
];

async function checkSizes() {
  console.log("Checking table sizes...");
  for (const tabla of TABLAS) {
    const { count, error } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`Error in ${tabla}:`, error.message);
    } else {
      console.log(`${tabla.padEnd(25)}: ${count} rows`);
    }
  }
}

checkSizes();
