const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://wzjotqragegymyejudnm.supabase.co', 'sb_publishable_c93g3MVcUxODgTKUG3PrFQ_8YZA6bun');
const tablas = ['organizacion', 'pipelines', 'contactos', 'deals', 'tareas', 'empresaConfigs', 'usuariosApp', 'empresas', 'whatsapp_accounts', 'productos', 'facturas'];

async function test() {
  for (const t of tablas) {
    const start = Date.now();
    try {
      const res = await Promise.race([
        sb.from(t).select('id').limit(1),
        new Promise((_,r) => setTimeout(() => r(new Error('TIMEOUT')), 5000))
      ]);
      console.log(t, Date.now() - start, 'ms', res.error ? res.error.message : 'OK');
    } catch (e) {
      console.log(t, Date.now() - start, 'ms', e.message);
    }
  }
}
test();
