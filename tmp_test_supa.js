import { createClient } from '@supabase/supabase-js';

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const PUB_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const SR_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo";

async function test() {
  console.log("Testing with Publishable Key...");
  const c1 = createClient(SUPA_URL, PUB_KEY);
  try {
    const { data, error } = await c1.from('organizacion').select('*').limit(1);
    console.log("C1 Result:", { data, error: error?.message });
  } catch (e) {
    console.error("C1 Crash:", e.message);
  }

  console.log("\nTesting with Service Role Key...");
  const c2 = createClient(SUPA_URL, SR_KEY);
  try {
    const { data, error } = await c2.from('organizacion').select('*').limit(1);
    console.log("C2 Result:", { data, error: error?.message });
  } catch (e) {
    console.error("C2 Crash:", e.message);
  }
}

test();
