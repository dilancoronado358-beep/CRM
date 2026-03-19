const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'email_accounts' }).catch(() => ({error: 'RPC not found'}));
  if (error) {
    // Fallback: try to select one row and see
    const { data: rows, error: err2 } = await supabase.from('email_accounts').select('*').limit(1);
    console.log("Rows:", rows);
    console.log("Error:", err2);
  } else {
    console.log(data);
  }
}
check();
