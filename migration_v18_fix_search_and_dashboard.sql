-- Migration v18: Fix Search and Dashboard RPCs
-- Date: 2025-12-01
-- Description: Update RPC functions to support new schema (batch_number, form, strength)

-- 1. Update search_products to include batch_number and form
DROP FUNCTION IF EXISTS search_products(text, integer, integer);

CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  stock INTEGER,
  price DECIMAL,
  items_per_box INTEGER,
  price_per_box DECIMAL,
  selling_unit TEXT,
  min_stock_level INTEGER,
  expiry_date DATE,
  batch_number TEXT,
  form TEXT,
  strength TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.stock,
    p.price,
    p.items_per_box,
    p.price_per_box,
    p.selling_unit,
    p.min_stock_level,
    p.expiry_date,
    p.batch_number,
    p.form,
    p.strength
  FROM products p
  WHERE
    p.organization_id = auth.uid()
    AND p.deleted_at IS NULL
    AND (
      search_term IS NULL OR search_term = '' OR
      p.name ILIKE '%' || search_term || '%' OR
      p.batch_number ILIKE '%' || search_term || '%' OR
      p.form ILIKE '%' || search_term || '%'
    )
  ORDER BY p.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. Update get_near_expiry_products to use form instead of category
DROP FUNCTION IF EXISTS get_near_expiry_products(integer);

CREATE OR REPLACE FUNCTION get_near_expiry_products(days_threshold integer DEFAULT 15)
RETURNS TABLE (
    id uuid,
    name text,
    form text,
    strength text,
    stock integer,
    expiry_date date,
    days_until_expiry integer,
    batch_number text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.form,
        p.strength,
        p.stock,
        p.expiry_date,
        (p.expiry_date - CURRENT_DATE) as days_until_expiry,
        p.batch_number
    FROM public.products p
    WHERE p.organization_id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.expiry_date IS NOT NULL
        AND p.expiry_date >= CURRENT_DATE
        AND p.expiry_date <= (CURRENT_DATE + days_threshold)
    ORDER BY p.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update get_low_stock_products to use form instead of category
DROP FUNCTION IF EXISTS get_low_stock_products();

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
    id uuid,
    name text,
    form text,
    strength text,
    stock integer,
    min_stock_level integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.form,
        p.strength,
        p.stock,
        p.min_stock_level
    FROM public.products p
    WHERE p.organization_id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.stock <= p.min_stock_level
    ORDER BY p.stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
