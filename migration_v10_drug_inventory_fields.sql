-- Migration v10: Add Drug Inventory Fields
-- Description: Adds generic_name, drug_type, and category columns to products table

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS generic_name TEXT,
ADD COLUMN IF NOT EXISTS drug_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.generic_name IS 'Generic/scientific name of the drug (e.g., Acetaminophen for Panadol)';
COMMENT ON COLUMN products.drug_type IS 'Form of medication (e.g., Tablet, Syrup, Capsule, Injection, Cream)';
COMMENT ON COLUMN products.category IS 'Medical category (e.g., Analgesic, Antibiotic, Antacid, Antihistamine)';

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS search_products(text, integer, integer);

-- Update the search_products function to include new fields and search by generic_name
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  generic_name TEXT,
  drug_type TEXT,
  category TEXT,
  stock INTEGER,
  price DECIMAL,
  items_per_box INTEGER,
  price_per_box DECIMAL,
  selling_unit TEXT,
  min_stock_level INTEGER,
  expiry_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.generic_name,
    p.drug_type,
    p.category,
    p.stock,
    p.price,
    p.items_per_box,
    p.price_per_box,
    p.selling_unit,
    p.min_stock_level,
    p.expiry_date
  FROM products p
  WHERE
    p.organization_id = auth.uid()
    AND p.deleted_at IS NULL
    AND (
      search_term IS NULL OR search_term = '' OR
      p.name ILIKE '%' || search_term || '%' OR
      p.generic_name ILIKE '%' || search_term || '%' OR
      p.barcode ILIKE '%' || search_term || '%'
    )
  ORDER BY p.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
