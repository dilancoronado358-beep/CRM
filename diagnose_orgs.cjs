const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  console.log("--- USUARIOS APP ---");
  const { data: users } = await sb.from('usuariosApp').select('email, org_id, role');
  console.table(users);

  console.log("\n--- CUENTAS DE EMAIL ---");
  const { data: accounts } = await sb.from('email_accounts').select('id, email, org_id, active, user_id');
  console.table(accounts);

  console.log("\n--- ÚLTIMOS 5 EMAILS ---");
  const { data: emails } = await sb.from('emails').select('id, de, asunto, org_id, user_id, carpeta').order('created_at', { ascending: false }).limit(5);
  console.table(emails);
}

check();
