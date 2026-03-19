
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function checkOrgs() {
  console.log("Checking organizations...");
  const { data, error } = await supabase.from('organizacion').select('id, nombre, wa_server_url');
  if (error) {
    console.error("Error orgs:", error.message);
  } else {
    console.log(`Orgs found: ${data.length}`);
    data.forEach(o => console.log(`- ${o.nombre} (${o.id}): ${o.wa_server_url}`));
  }
}

checkOrgs();
