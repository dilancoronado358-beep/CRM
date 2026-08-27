const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function checkProductos() {
  const { data, error } = await sb.from('productos').select('*').limit(1);
  if (error) {
    console.error("Error fetching productos:", error.message);
  } else if (data && data.length > 0) {
    console.log("COLUMNS IN 'productos':", Object.keys(data[0]));
    console.log("FIRST RECORD ID TYPE:", typeof data[0].id, data[0].id);
  } else {
    // Try to get column names from information_schema if possible, but easier to just check if insert works
    console.log("Tabla productos vacía.");
  }
}

checkProductos();
