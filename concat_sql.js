const fs = require('fs');
const path = require('path');

const files = [
  "db_update.sql",
  "db_facturacion_tienda.sql",
  "db_setup_documentos.sql",
  "db_whatsapp_multi_account.sql",
  "db_fix_api_isolation.sql",
  "db_update_enterprise.sql",
  "db_update_finanzas.sql",
  "db_update_v6_notifications.sql",
  "db_update_v7_audit.sql",
  "db_update_v8_webhooks.sql",
  "db_update_v9_email.sql",
  "db_update_v10_public_pages.sql",
  "db_update_v11_usuarios_app.sql",
  "db_migration_orgs.sql",
  "whatsapp_fix.sql",
  "whatsapp_rls_fix.sql",
  "db_fix_missing_tables.sql",
  "db_fix_notifications_leida.sql",
  "db_fix_email_oauth.sql",
  "db_fix_emails_final.sql",
  "db_mega_fix_automatizaciones.sql",
  "db_update_pillar2_docs.sql"
];

let output = "-- MASTER SCHEMA V1 (CLEAN SLATE)\n\n";

for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    output += `-- ==========================================\n`;
    output += `-- FROM FILE: ${file}\n`;
    output += `-- ==========================================\n\n`;
    output += content + "\n\n";
  }
}

fs.writeFileSync("master_schema_raw.sql", output);
console.log("Created master_schema_raw.sql");
