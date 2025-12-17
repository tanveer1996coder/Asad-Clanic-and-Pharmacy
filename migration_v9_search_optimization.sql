-- Migration: Add Search Products RPC
-- Date: 2025-12-01
-- Description: Add a server-side function to search products efficiently

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
      p.name ILIKE '%' || search_term || '%'
    )
  ORDER BY p.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
