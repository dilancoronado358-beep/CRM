const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Usuario/Desktop/mi-crm/server/.env' });

async function setup() {
  const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);
  
  console.log('--- SETUP STORAGE & DB ---');

  // 1. Intentar crear bucket
  try {
    const { data: bucket, error: bErr } = await supabase.storage.createBucket('email-attachments', {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (bErr) console.log('Bucket Info:', bErr.message);
    else console.log('✅ Bucket created or already exists.');
  } catch (e) {
    console.log('Bucket Error:', e.message);
  }

  // 2. Intentar añadir columna via RPC (si existe sql_exec o similar)
  // Como no sabemos si existe, lo intentaremos via una query que falle si no existe
  // En realidad, sin SQL directo es difícil. 
  // Intentaremos un truco: upsert con la columna. Si falla "column adjuntos does not exist", confirmamos que falta.
  try {
    const { error: colErr } = await supabase.from('emails').upsert({
      id: 'test_col',
      adjuntos: []
    });
    if (colErr && colErr.message.includes('column "adjuntos" of relation "emails" does not exist')) {
      console.log('⚠️ La columna "adjuntos" NO existe. El usuario deberá crearla manualmente.');
    } else if (colErr) {
        console.log('Column check error:', colErr.message);
    } else {
      console.log('✅ La columna "adjuntos" ya existe o fue creada.');
    }
  } catch (e) {
    console.log('Column Exception:', e.message);
  }
}

setup();
