const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function repair() {
  console.log("Iniciando reparación de cuenta...");
  const { data, error, status } = await sb
    .from('whatsapp_accounts')
    .update({ activa: true })
    .eq('id', '8087e17a-6a93-4cae-827a-f3c8559b16f4');
  
  if (error) {
    console.error("Error detectado:", error);
  } else {
    console.log("¡ÉXITO! Cuenta 8087 activada. Status:", status);
  }
  process.exit(0);
}

repair();
