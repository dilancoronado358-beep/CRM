const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://eoylgxwlhsmwqgadahvk.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveWxneHdsaHNtd3FnYWRhaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA5Mjg3MiwiZXhwIjoyMDg4NjY4ODcyfQ.u367x5l1D2pnxj0Ns43iefrIbY4Z34H_9LijN6bahEo"
);

async function resetPassword() {
  const email = "admin@ensing.lat";
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log("User not found in auth.users!");
    return;
  }
  
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: "admin123",
    email_confirm: true // Just in case
  });
  
  if (error) {
    console.error("Error updating password:", error);
  } else {
    console.log("SUCCESS! Password updated to admin123 for:", email);
  }
}

resetPassword();
