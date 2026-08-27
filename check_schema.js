const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './server/.env' });

const SUPA_URL = process.env.SUPA_URL || "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = process.env.SUPA_KEY || "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  console.log("Checking emails table structure...");
  const { data, error } = await sb.from('emails').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Columns:", data.length > 0 ? Object.keys(data[0]) : "Table empty, can't determine columns from data");
  }
}

check();
