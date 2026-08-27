const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('email_accounts').select('id, provider, email');
  console.log(data);
}
check();
