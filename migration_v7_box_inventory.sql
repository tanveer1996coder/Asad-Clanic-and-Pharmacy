-- Migration: Add Box-based Inventory System Fields
-- Date: 2025-11-30
-- Description: Add fields to support box-based inventory (items per box, pricing, selling units)

-- Add columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS items_per_box INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS price_per_box DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS selling_unit TEXT DEFAULT 'item' CHECK (selling_unit IN ('box', 'item', 'both'));

-- Add comment to explain the columns
COMMENT ON COLUMN products.items_per_box IS 'Number of items (tablets/injections/etc) in one box';
COMMENT ON COLUMN products.price_per_box IS 'Purchase price per box';
COMMENT ON COLUMN products.selling_unit IS 'How this product can be sold: box, item, or both';

-- Add columns to stock_receipts table
ALTER TABLE stock_receipts
ADD COLUMN IF NOT EXISTS boxes_received INTEGER,
ADD COLUMN IF NOT EXISTS items_per_box INTEGER;

-- Add comment to explain the columns
COMMENT ON COLUMN stock_receipts.boxes_received IS 'Number of boxes received in this stock receipt';
COMMENT ON COLUMN stock_receipts.items_per_box IS 'Snapshot of items per box at time of receipt (for historical accuracy)';

-- Update existing records to have default values
-- This ensures backward compatibility
UPDATE products
SET items_per_box = 1
WHERE items_per_box IS NULL;

UPDATE products
SET selling_unit = 'item'
WHERE selling_unit IS NULL;
