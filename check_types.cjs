const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function checkTypes() {
  console.log("Checking emails column types...");
  // Try to insert a malformed ID to see the error message which often contains the expected type
  const { error } = await sb.from('emails').insert({ 
    id: 'type_check_' + Date.now(), 
    deal_id: 'not-a-uuid' 
  });
  
  if (error) {
    console.log("Caught expected error:", error.message);
    if (error.message.includes("uuid")) {
      console.log("Confirmed: deal_id is a UUID column.");
    } else {
      console.log("Error message does not mention UUID. Might be something else.");
    }
  } else {
    console.log("Success! deal_id accepted 'not-a-uuid', so it is likely TEXT or VARCHAR.");
    // Cleanup
    await sb.from('emails').delete().eq('id', 'type_check_' + Date.now());
  }
}

checkTypes();
