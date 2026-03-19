const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

async function checkStorage() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }
  const exists = buckets.find(b => b.id === 'email-attachments');
  if (!exists) {
    console.log("Bucket 'email-attachments' does not exist. Creating...");
    const { data, error: createErr } = await supabase.storage.createBucket('email-attachments', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (createErr) console.error("Error creating bucket:", createErr.message);
    else console.log("Bucket created successfully.");
  } else {
    console.log("Bucket 'email-attachments' already exists.");
  }
}
checkStorage();
