const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applySql() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node apply_sql.cjs <file.sql>');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');
  console.log(`Applying SQL from ${sqlFile}...`);

  // Supabase JS client doesn't have a direct 'sql' method, 
  // but we can use RPC if we have a function defined, 
  // or we can use the 'query' hack:

  // Alternative: Using specialized 'exec_sql' RPC if available, 
  // but usually we don't. So we'll try to use the REST API directly 
  // for a simple query or just use the UI if we have to.

  // SINCE WE ARE AN AGENT, we'll try to use a dummy insert to check connection 
  // and then we'll have to trust that the user runs the SQL in the dashboard 
  // IF we can't run it here. 

  // HOWEVER, I can try to use 'pg' if installed, or just use the Supabase 'rpc' 
  // if I've previously defined a runner.

  console.log("NOTE: Running complex SQL migrations from JS is limited. I will try to run it via RPC 'exec_sql'.");

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error applying SQL:', error);
    console.log("\n--- FALLBACK ---");
    console.log("Please run the content of the SQL file manually in the Supabase SQL Editor if this failed.");
  } else {
    console.log('SQL applied successfully!', data);
  }
}

applySql();
