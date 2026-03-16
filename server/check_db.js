
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  console.log("Checking whatsapp_automations...");
  const { data: rules, error } = await supabase.from('whatsapp_automations').select('*');
  if (error) {
    console.error("Error rules:", error.message);
  } else {
    console.log(`Rules found: ${rules.length}`);
    rules.forEach(r => console.log(`- ${r.keyword}: AI: ${!!r.ai_prompt}, Active: ${r.active}`));
  }

  console.log("\nChecking chatbotRules (Legacy)...");
  const { data: legacy, error: err2 } = await supabase.from('chatbotRules').select('*');
  if (err2) {
    console.error("Error legacy:", err2.message);
  } else {
    console.log(`Legacy rules found: ${legacy?.length || 0}`);
  }
}

check();
