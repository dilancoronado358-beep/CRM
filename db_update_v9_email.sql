-- PHASE 43: UNIVERSAL EMAIL INTEGRATION SCHEMA

-- Table for Email Accounts (SMTP/IMAP credentials)
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT, -- Stored securely (or App Password)
    provider TEXT DEFAULT 'custom', -- 'gmail', 'outlook', 'yahoo', 'custom'
    smtp_host TEXT,
    smtp_port INTEGER,
    imap_host TEXT,
    imap_port INTEGER,
    active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for Synced Emails
CREATE TABLE IF NOT EXISTS public.emails (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    carpeta TEXT DEFAULT 'entrada', -- 'entrada', 'enviados', 'borradores', 'papelera'
    de TEXT NOT NULL,
    para TEXT NOT NULL,
    cc TEXT,
    bcc TEXT,   
    asunto TEXT,
    cuerpo TEXT,
    html TEXT,
    fecha TIMESTAMP WITH TIME ZONE,
    leido BOOLEAN DEFAULT false,
    mensaje_id TEXT UNIQUE, -- IMAP Message ID to avoid duplicates
    contacto_id TEXT REFERENCES public.contactos(id) ON DELETE SET NULL,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching contacts by email
CREATE INDEX IF NOT EXISTS idx_emails_de ON public.emails(de);
CREATE INDEX IF NOT EXISTS idx_emails_para ON public.emails(para);

-- Disable RLS for now to facilitate initial sync development
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;
