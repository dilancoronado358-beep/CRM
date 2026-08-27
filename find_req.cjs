const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function findRequired() {
  const { error } = await sb.from('emails').insert({ id: 'req_test_' + Date.now() });
  console.log("Required column error:");
  console.log(JSON.stringify(error, null, 2));
}

findRequired();
