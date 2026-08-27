const imaps = require('imap-simple');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Usuario/Desktop/mi-crm/server/.env' });

async function test() {
  const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);
  const { data: acc } = await supabase.from('email_accounts').select('*').eq('email', 'dilancoronado358@gmail.com').single();
  
  const config = {
    imap: {
      user: acc.email,
      xoauth2: Buffer.from(`user=${acc.email}\x01auth=Bearer ${acc.access_token}\x01\x01`).toString('base64'),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 5000
    }
  };

  try {
    const connection = await imaps.connect(config);
    const boxes = await connection.getBoxes();
    const list = (obj, indent = "") => {
      for (const k in obj) {
        console.log(indent + k);
        if (obj[k].children) list(obj[k].children, indent + "  ");
      }
    };
    list(boxes);
    connection.end();
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
