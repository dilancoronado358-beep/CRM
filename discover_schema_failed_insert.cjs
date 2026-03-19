const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function dumpSchema() {
  const testData = {
    id: 'test_diag_2_' + Date.now(),
    org_id: '00000000-0000-0000-0000-000000000001',
    cuenta_id: 'test_acc', 
    de: 'test@example.com',
    para: 'test@example.com',
    asunto: 'Test diag 2',
    cuerpo: 'Test body 2',
    fecha: new Date().toISOString(),
    mensaje_id: 'test_msg_2_' + Date.now()
  };

  const { error } = await sb.from('emails').insert(testData);
  if (error) {
    console.log("Insert failed. Error message:");
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log("Insert worked with 'cuenta_id'!");
  }
}

dumpSchema();
