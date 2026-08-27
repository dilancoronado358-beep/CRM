
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const NEW_URL = process.argv[2];

if (!NEW_URL) {
  console.error("Usage: node sync_orgs.js <CLOUDFLARE_TUNNEL_URL>");
  process.exit(1);
}

async function syncOrgs() {
  console.log(`Syncing all organizations to: ${NEW_URL}`);
  
  // Update ALL organizations to use the new Cloudflare URL
  const { data, error } = await supabase
    .from('organizacion')
    .update({ wa_server_url: NEW_URL })
    .not('id', 'is', null);

  if (error) {
    console.error("Error syncing orgs:", error.message);
  } else {
    console.log("✅ Successfully updated all organizations.");
  }
}

syncOrgs();
