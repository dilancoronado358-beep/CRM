const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Using names from server/.env
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

async function applySql() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node apply_sql.js <file.sql>');
    process.exit(1);
  }

  let sqlPath = path.resolve(sqlFile);
  if (!fs.existsSync(sqlPath)) {
      sqlPath = path.resolve('..', sqlFile);
  }

  if (!fs.existsSync(sqlPath)) {
      console.error(`File not found: ${sqlFile}`);
      process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Applying SQL from ${sqlPath}...`);

  // We check if 'exec_sql' exists, but if not we'll try a fallback.
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
       console.error('Error applying SQL via RPC:', error.message);
       console.log('Trying to run as a single string if possible (limited)...');
       // Some environments allow direct execution via a specific endpoint 
       // but standard Supabase JS client doesn't support raw SQL without RPC.
       console.log('\n--- MANUAL ACTION REQUIRED ---');
       console.log('Please copy and paste the contents of the following file into your Supabase SQL Editor:');
       console.log(sqlPath);
       process.exit(1);
    } else {
      console.log('SQL applied successfully!');
    }
  } catch (e) {
    console.error('Exception applying SQL:', e.message);
    process.exit(1);
  }
}

applySql();
