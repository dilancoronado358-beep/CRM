// script to test upsert in browser
async function testUpsert() {
  const sb = window.__SUPABASE_CLIENT__;
  if (!sb) {
    console.error("No supabase client found");
    return;
  }
  console.log("Testing upsert...");
  const start = Date.now();
  try {
    const { data, error } = await sb.from('organizacion').upsert({
      id: "00000000-0000-0000-0000-000000000888",
      nombre: "Test Org Browser"
    }).select();
    console.log("Upsert result:", Date.now() - start, "ms", { data, error });
  } catch (e) {
    console.error("Upsert exception:", e);
  }
}
testUpsert();
