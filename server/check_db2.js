const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  console.log("Checking landing_pages...");
  const { data: lp, error: err1 } = await supabase.from('landing_pages').select('*');
  console.log(err1 ? err1 : lp);

  console.log("Checking formularios_publicos...");
  const { data: fp, error: err2 } = await supabase.from('formularios_publicos').select('*');
  console.log(err2 ? err2 : fp);
}

check();
