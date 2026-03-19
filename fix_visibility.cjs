const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://eoylgxwlhsmwqgadahvk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo');

const sql = `
-- Arreglar visibilidad de email_accounts para la organización
DROP POLICY IF EXISTS "Users can view their own email accounts" ON email_accounts;
CREATE POLICY "Visibilidad organizacional de cuentas de correo" 
ON email_accounts FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM "usuariosApp" WHERE email = auth.jwt()->>'email'
  )
);

-- Limpiar waServerUrl de usuariosApp
UPDATE "usuariosApp" SET "waServerUrl" = NULL;

-- Actualizar wa_server_url global de la organización principal
UPDATE organizacion 
SET wa_server_url = 'https://janiece-apocatastatic-intensionally.ngrok-free.dev' 
WHERE id = '00000000-0000-0000-0000-000000000001';
`;

async function main() {
  console.log("Ejecutando SQL de visibilidad y limpieza...");
  const { data, error } = await s.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Error ejecutando SQL:", error);
  } else {
    console.log("SQL ejecutado exitosamente:", data);
  }
}

main();
