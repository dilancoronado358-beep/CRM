-- ============================================================
-- MEGA FIX: FACTURACIÓN, TIENDA & AISLAMIENTO
-- ============================================================

-- 1. ASEGURAR TABLA ORGANIZACION Y ORG POR DEFECTO
CREATE TABLE IF NOT EXISTS public.organizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE,
    wa_server_url TEXT,
    creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.organizacion (id, nombre, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Organización Principal', 'principal')
ON CONFLICT (id) DO NOTHING;

-- 2. ASEGURAR COLUMNAS org_id EN TABLAS CLAVE
DO $$ 
DECLARE 
    t TEXT;
    tablas TEXT[] := ARRAY['productos', 'facturas', 'contactos', 'usuariosApp'];
BEGIN 
    FOREACH t IN ARRAY tablas LOOP
        -- Añadir columna org_id si no existe
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizacion(id) DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
        -- Forzar a que los registros nulos tengan la org por defecto
        EXECUTE format('UPDATE public.%I SET org_id = ''00000000-0000-0000-0000-000000000001'' WHERE org_id IS NULL', t);
    END LOOP;
END $$;

-- 3. ACTUALIZAR TABLA PRODUCTOS CON TODOS LOS CAMPOS DE TIENDA
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS precio_costo      NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock             INTEGER       DEFAULT 0;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock_minimo      INTEGER       DEFAULT 5;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS talla             TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS color             TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url        TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS destacado         BOOLEAN       DEFAULT FALSE;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tipo              TEXT          DEFAULT 'otro';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS unidad            TEXT          DEFAULT 'Unidad';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS peso_volumen      TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS refrigerado       BOOLEAN       DEFAULT FALSE;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS categoria         TEXT          DEFAULT 'General';

-- 4. TABLA FACTURAS (Asegurar estructura)
CREATE TABLE IF NOT EXISTS public.facturas (
  id               TEXT PRIMARY KEY,
  numero           TEXT NOT NULL,
  org_id           UUID REFERENCES public.organizacion(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  cliente_nombre   TEXT NOT NULL,
  cliente_email    TEXT,
  cliente_cedula   TEXT,
  cliente_telefono TEXT,
  fecha_emision    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  items            JSONB DEFAULT '[]',
  subtotal         NUMERIC(12,2) DEFAULT 0,
  iva_pct          NUMERIC(5,2)  DEFAULT 14,
  iva_amount       NUMERIC(12,2) DEFAULT 0,
  total            NUMERIC(12,2) DEFAULT 0,
  metodo_pago      TEXT DEFAULT 'Transferencia',
  estado           TEXT DEFAULT 'borrador'
                   CHECK (estado IN ('borrador','pendiente','pagada','vencida','anulada')),
  notas            TEXT,
  creado           TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada empresa solo ve SUS facturas
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_org_isolation" ON public.facturas;
CREATE POLICY "facturas_org_isolation" ON public.facturas
FOR ALL TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public."usuariosApp"
    WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public."usuariosApp"
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_facturas_org_id  ON public.facturas(org_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado  ON public.facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_numero  ON public.facturas(numero);


-- ────────────────────────────────────────────────────────────
-- 2. AMPLIAR TABLA PRODUCTOS (campos para la Tienda)
-- ────────────────────────────────────────────────────────────
-- ASEGURAR COLUMNA org_id (CRÍTICO PARA RLS)
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizacion(id) DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS precio_costo      NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock             INTEGER       DEFAULT 0;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock_minimo      INTEGER       DEFAULT 5;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS talla             TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS color             TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url        TEXT          DEFAULT '';
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS destacado         BOOLEAN       DEFAULT FALSE;
-- Nuevos campos para distinción Ropa / Alimentos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tipo              TEXT          DEFAULT 'otro';   -- ropa | alimentos | otro
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS unidad            TEXT          DEFAULT 'Unidad'; -- solo alimentos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS peso_volumen      TEXT          DEFAULT '';       -- solo alimentos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;                           -- solo alimentos
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS refrigerado       BOOLEAN       DEFAULT FALSE;    -- solo alimentos

-- Asegurar que productos tenga RLS activo
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_org_isolation" ON public.productos;
CREATE POLICY "productos_org_isolation" ON public.productos
FOR ALL TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public."usuariosApp"
    WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public."usuariosApp"
    WHERE email = auth.jwt() ->> 'email'
  )
);


-- ────────────────────────────────────────────────────────────
-- 3. CAMPO cédula Y AISLAMIENTO EN CONTACTOS
-- ────────────────────────────────────────────────────────────
-- ASEGURAR COLUMNA org_id
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizacion(id) DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS cedula TEXT DEFAULT '';
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS ruc    TEXT DEFAULT '';
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT '';

-- Índice para búsqueda rápida por cédula/RUC
CREATE INDEX IF NOT EXISTS idx_contactos_cedula ON public.contactos(cedula);
CREATE INDEX IF NOT EXISTS idx_contactos_ruc    ON public.contactos(ruc);

-- Asegurar RLS en contactos
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE RLS REFORZADAS
DO $$ 
DECLARE 
    t TEXT;
    tablas TEXT[] := ARRAY['productos', 'facturas', 'contactos', 'empresas'];
BEGIN 
    FOREACH t IN ARRAY tablas LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Aislamiento Total V3" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Aislamiento Total V4" ON public.%I', t);
        
        EXECUTE format('
            CREATE POLICY "Aislamiento Total V4" ON public.%I
            FOR ALL TO authenticated
            USING (
                org_id IN (
                    SELECT org_id FROM public."usuariosApp" 
                    WHERE (email = auth.jwt() ->> ''email'' OR id = auth.uid()::text)
                    OR role = ''admin''
                )
            )
            WITH CHECK (
                org_id IN (
                    SELECT org_id FROM public."usuariosApp" 
                    WHERE (email = auth.jwt() ->> ''email'' OR id = auth.uid()::text)
                    OR role = ''admin''
                )
            )
        ', t);
    END LOOP;
END $$;

-- LIBERAR TABLA DE USUARIOS PARA VISIBILIDAD TOTAL DEL ADMIN
ALTER TABLE public."usuariosApp" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ve todos los usuarios" ON public."usuariosApp";
DROP POLICY IF EXISTS "Aislamiento por Org" ON public."usuariosApp";

-- 6. ASIGNAR ORG A USUARIO ACTUAL (Para que no se bloquee a sí mismo)
UPDATE public."usuariosApp" 
SET org_id = '00000000-0000-0000-0000-000000000001' 
WHERE (email = auth.jwt() ->> 'email' OR id = auth.uid()::text) AND org_id IS NULL;

-- 7. RECARGAR SCHEMA
NOTIFY pgrst, 'reload schema';
