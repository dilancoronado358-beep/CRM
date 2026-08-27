const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function inspect() {
  console.log("Inspeccionando mensajes en Supabase...");
  
  // 1. Conteo total
  const { count, error: countErr } = await sb
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true });
  
  // 2. Ver los últimos 3 mensajes para ver la estructura
  const { data: samples, error: sampleErr } = await sb
    .from('whatsapp_messages')
    .select('*')
    .order('creado_at', { ascending: false })
    .limit(3);

  console.log("Total de mensajes encontrados:", count);
  if (samples && samples.length > 0) {
    console.log("Muestra del último mensaje:", JSON.stringify(samples[0], null, 2));
  } else {
    console.log("No se encontraron muestras. La tabla parece estar vacía o inaccesible.");
  }
}

inspect();
