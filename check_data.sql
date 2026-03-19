-- Total count of emails
SELECT count(*) FROM emails;

-- Latest 5 emails
SELECT id, de, asunto, created_at FROM emails ORDER BY created_at DESC LIMIT 5;
