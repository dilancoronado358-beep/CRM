import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // or whichever path .env is in

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('whatsapp_messages').select('*').limit(10).order('timestamp', { ascending: false });
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  if (data?.length > 0) {
    console.log("Sample:", data[0]);
  }
}

check();
