const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, supabaseKey);

async function repair() {
  console.log("Activando cuenta 8087...");
  const { data, error } = await sb
    .from('whatsapp_accounts')
    .update({ activa: true })
    .eq('id', '8087e17a-6a93-4cae-827a-f3c8559b16f4');
  
  if (error) console.error("Error:", error);
  else console.log("Cuenta activada con éxito!");
}

repair();
