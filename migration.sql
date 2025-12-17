-- ========================================
-- Quick Migration for Existing Database
-- Run this in Supabase SQL Editor
-- ========================================

-- Add missing updated_at column to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone 
DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add missing updated_at columns to other tables
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone 
DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone 
DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to auto-update timestamps
DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS suppliers_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update settings table constraint for better multi-tenancy
DROP INDEX IF EXISTS settings_key_key;
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS settings_unique_key_org 
ON public.settings(key, organization_id);

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('settings', 'suppliers', 'products') 
AND column_name = 'updated_at';
