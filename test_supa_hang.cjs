const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://wzjotqragegymyejudnm.supabase.co";
const SUPA_KEY = "sb_publishable_c93g3MVcUxODgTKUG3PrFQ_8YZA6bun";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function testInsert() {
  console.log("Starting insert test on organizacion...");
  try {
    const { data, error } = await sb.from("organizacion").upsert({
      id: "00000000-0000-0000-0000-000000000999",
      nombre: "Test Timeout",
      slug: "test-timeout",
      activo: true
    }).select();
    
    if (error) {
      console.log("Error inserting:", error);
    } else {
      console.log("Success inserting:", data);
    }
  } catch (e) {
    console.error("Exception caught:", e);
  }
}

testInsert();
