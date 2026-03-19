import { createClient } from '@supabase/supabase-js';
const SUPA_URL = 'https://eoylgxwlhsmwqgadahvk.supabase.co';
const SUPA_KEY = 'sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa';
const sb = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  const { data: orgs, error } = await sb.from('organizacion').select('*');
  console.log('--- ORGANIZATIONS ---');
  console.log(JSON.stringify(orgs, null, 2));
}

check();
