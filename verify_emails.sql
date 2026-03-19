-- Query the emails table to see the latest synced emails
SELECT id, de, asunto, para, fecha, mensaje_id, contacto_id, created_at 
FROM emails 
ORDER BY created_at DESC 
LIMIT 5;
