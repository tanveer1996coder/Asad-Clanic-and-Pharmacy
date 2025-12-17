-- Migration v8: Box-based Purchase Orders
-- Adds support for tracking boxes in Purchase Orders and Receiving History

-- =============================================
-- 1. ADD COLUMNS TO PURCHASE_ORDER_ITEMS
-- =============================================
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS boxes_ordered INTEGER,
ADD COLUMN IF NOT EXISTS items_per_box INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cost_per_box DECIMAL(12, 2);

-- =============================================
-- 2. ADD COLUMNS TO PO_RECEIVING_HISTORY
-- =============================================
ALTER TABLE po_receiving_history
ADD COLUMN IF NOT EXISTS boxes_received INTEGER;

-- =============================================
-- 3. UPDATE EXISTING RECORDS (OPTIONAL)
-- =============================================
-- Set default items_per_box to 1 for existing records if null
UPDATE purchase_order_items
SET items_per_box = 1
WHERE items_per_box IS NULL;
