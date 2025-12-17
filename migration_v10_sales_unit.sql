-- Migration: Add Unit details to Sales table
-- Date: 2025-11-30
-- Description: Add selling_unit and items_per_box to sales table to track box vs item sales accurately

-- Add columns to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS selling_unit TEXT DEFAULT 'item' CHECK (selling_unit IN ('box', 'item')),
ADD COLUMN IF NOT EXISTS items_per_box INTEGER DEFAULT 1;

-- Add comments
COMMENT ON COLUMN sales.selling_unit IS 'Unit sold: box or item';
COMMENT ON COLUMN sales.items_per_box IS 'Items per box at time of sale (for historical accuracy)';

-- Update existing records to have default values
UPDATE sales
SET selling_unit = 'item'
WHERE selling_unit IS NULL;

UPDATE sales
SET items_per_box = 1
WHERE items_per_box IS NULL;
