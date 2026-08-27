const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function checkColumns() {
  // Query arbitrary data to trigger error with column names
  const { error } = await sb.from('emails').select('non_existent_column_to_trigger_error');
  console.log("Error to see columns:", error?.message);
  
  // Try another approach: Insert with a totally wrong object and see the error
  const { error: insErr } = await sb.from('emails').insert({ dummy: 1 });
  console.log("Insert Error details:", insErr);
}

checkColumns();
