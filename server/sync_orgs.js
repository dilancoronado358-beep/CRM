
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const NEW_URL = "https://janiece-apocatastatic-intensionally.ngrok-free.dev";

async function syncOrgs() {
  console.log(`Syncing all organizations to: ${NEW_URL}`);
  
  // Update ALL organizations to use the new ngrok URL
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
