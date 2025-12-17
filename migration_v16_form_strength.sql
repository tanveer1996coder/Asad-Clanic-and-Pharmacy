-- Migration v16: Rename category to form and add strength
-- Date: 2025-12-01
-- Description: Align products table with medicine_reference structure

-- 1. Add strength column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS strength TEXT;

-- 2. Rename category to form
ALTER TABLE products RENAME COLUMN category TO form;

-- 3. Update search to use form instead of category
-- (This will be handled in the application code)

COMMENT ON COLUMN products.form IS 'Dosage form (tablet, capsule, syrup, etc.)';
COMMENT ON COLUMN products.strength IS 'Medicine strength (e.g., 500mg, 10ml)';
