const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function checkSchema() {
  console.log("Checking landing_pages schema...");
  const { data: lpData, error: err1 } = await supabase.rpc('get_table_columns_mock');
  
  // Since we don't have an RPC to get schema easily, let's insert a row with all possible JSON and catch error, or just do a generic upsert and see what fails.
  const testObj = {
      id: 'test_schema_1',
      slug: 'test_schema_1',
      titulo: 'Test',
      apariencia: { "test": "test" },
      test_col: 'test'
  };
  
  const { error: err2 } = await supabase.from('landing_pages').upsert(testObj);
  console.log(err2 ? err2.message : "Success");
  
  const { error: err3 } = await supabase.from('formularios_publicos').upsert(testObj);
  console.log(err3 ? err3.message : "Success");
}

checkSchema();
