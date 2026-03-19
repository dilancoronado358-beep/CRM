const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function checkSchema() {
  const { data, error } = await sb.from('emails').select('*').limit(1);
  if (error) {
    console.error("Error fetching emails:", error.message);
  } else if (data && data.length > 0) {
    console.log("Columnas encontradas:", Object.keys(data[0]));
  } else {
    console.log("La tabla 'emails' está vacía. No se puede inferir el esquema con SELECT *.");
    // Intentar vía rpc o información de esquema si es posible, pero usualmente no tenemos permisos.
    // Intentar una inserción de prueba fallida para ver el error?
    const { error: insErr } = await sb.from('emails').insert({ id: 'test_' + Date.now() });
    console.log("Error de inserción de prueba (útil para ver columnas requeridas):", insErr?.message);
  }
}

checkSchema();
