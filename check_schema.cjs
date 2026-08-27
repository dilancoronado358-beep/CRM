const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  console.log("Checking emails table structure and data...");
  const { data, error } = await sb.from('emails').select('*').order('fecha', { ascending: false }).limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Count:", data.length);
    if (data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
      console.log("Last 5 emails sample:");
      data.forEach(e => {
        console.log(`- ID: ${e.id}, Subject: ${e.asunto}, Date: ${e.fecha}, DealID: ${e.deal_id}, ContactID: ${e.contacto_id}`);
      });
    } else {
      console.log("Table empty.");
    }
  }
}

check();
