const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function readBack() {
  const { data, error } = await sb.from('emails').select('*');
  if (error) {
    console.error("Read Error:", error.message);
  } else if (data && data.length > 0) {
    console.log("COLUMNAS REALES DE LA TABLA 'emails':");
    console.log(Object.keys(data[0]));
    
    // Clean up
    for (const r of data) {
       if (r.id.startsWith('req_test_') || r.id.startsWith('test_diag')) {
         await sb.from('emails').delete().eq('id', r.id);
       }
    }
  } else {
    console.log("Tabla vacía después de la inserción? Algo anda mal.");
  }
}

readBack();
