-- Migration v6: Purchase Order Management System
-- Includes: Purchase orders, PO items, approval workflow, multi-currency support

-- =============================================
-- 1. CURRENCIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) UNIQUE NOT NULL, -- e.g., 'USD', 'PKR', 'EUR'
    name TEXT NOT NULL, -- e.g., 'US Dollar', 'Pakistani Rupee'
    symbol TEXT NOT NULL, -- e.g., '$', 'Rs', '€'
    exchange_rate DECIMAL(10, 4) DEFAULT 1.0, -- Rate relative to base currency
    is_base BOOLEAN DEFAULT false, -- One currency should be base
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, is_base, exchange_rate) VALUES
('PKR', 'Pakistani Rupee', 'Rs', true, 1.0),
('USD', 'US Dollar', '$', false, 278.50),
('EUR', 'Euro', '€', false, 305.00),
('GBP', 'British Pound', '£', false, 355.00),
('AED', 'UAE Dirham', 'د.إ', false, 75.80)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 2. PURCHASE ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),
    currency_id UUID REFERENCES currencies(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted ON purchase_orders(deleted_at);

-- =============================================
-- 3. PURCHASE ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

-- =============================================
-- 4. MODIFY STOCK_RECEIPTS TABLE
-- =============================================
ALTER TABLE stock_receipts 
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id);

CREATE INDEX IF NOT EXISTS idx_stock_receipts_po ON stock_receipts(purchase_order_id);

-- =============================================
-- 5. PURCHASE ORDER RECEIVING HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS po_receiving_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    po_item_id UUID REFERENCES purchase_order_items(id),
    quantity_received INTEGER NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES auth.users(id),
    stock_receipt_id UUID REFERENCES stock_receipts(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_receiving_po ON po_receiving_history(purchase_order_id);

-- =============================================
-- 6. FUNCTION: Generate PO Number
-- =============================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_code TEXT;
    po_num TEXT;
BEGIN
    year_code := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_code || '-%';
    
    po_num := 'PO-' || year_code || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. FUNCTION: Update PO Totals
-- =============================================
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    po_id UUID;
    subtotal DECIMAL(12, 2);
    disc_amt DECIMAL(12, 2);
    tax_amt DECIMAL(12, 2);
    final_amt DECIMAL(12, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        po_id := OLD.purchase_order_id;
    ELSE
        po_id := NEW.purchase_order_id;
    END IF;

    -- Calculate subtotal
    SELECT COALESCE(SUM(line_total), 0)
    INTO subtotal
    FROM purchase_order_items
    WHERE purchase_order_id = po_id;

    -- Get discount and tax percentages
    SELECT 
        discount_percentage,
        tax_percentage
    INTO disc_amt, tax_amt
    FROM purchase_orders
    WHERE id = po_id;

    -- Calculate amounts
    disc_amt := subtotal * (COALESCE(disc_amt, 0) / 100);
    tax_amt := (subtotal - disc_amt) * (COALESCE(tax_amt, 0) / 100);
    final_amt := subtotal - disc_amt + tax_amt;

    -- Update PO
    UPDATE purchase_orders
    SET 
        total_amount = subtotal,
        discount_amount = disc_amt,
        tax_amount = tax_amt,
        final_amount = final_amt,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = po_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update PO totals
DROP TRIGGER IF EXISTS trigger_update_po_totals ON purchase_order_items;
CREATE TRIGGER trigger_update_po_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

-- =============================================
-- 8. FUNCTION: Update PO Status Based on Receiving
-- =============================================
CREATE OR REPLACE FUNCTION update_po_status_on_receive()
RETURNS TRIGGER AS $$
DECLARE
    total_ordered INTEGER;
    total_received INTEGER;
    po_id UUID;
BEGIN
    po_id := NEW.purchase_order_id;

    -- Get total ordered and received quantities
    SELECT 
        SUM(quantity_ordered),
        SUM(quantity_received)
    INTO total_ordered, total_received
    FROM purchase_order_items
    WHERE purchase_order_id = po_id;

    -- Update PO status
    IF total_received = 0 THEN
        -- No items received yet, keep current status
        NULL;
    ELSIF total_received >= total_ordered THEN
        -- All items received
        UPDATE purchase_orders
        SET 
            status = 'received',
            actual_delivery_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = po_id;
    ELSE
        -- Partial receiving
        UPDATE purchase_orders
        SET 
            status = 'partially_received',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = po_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update PO status
DROP TRIGGER IF EXISTS trigger_update_po_status ON purchase_order_items;
CREATE TRIGGER trigger_update_po_status
AFTER UPDATE OF quantity_received ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_po_status_on_receive();

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_receiving_history ENABLE ROW LEVEL SECURITY;

-- Currencies: Public read for all authenticated users
DROP POLICY IF EXISTS "Users can view currencies" ON currencies;
CREATE POLICY "Users can view currencies" ON currencies
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Purchase Orders: Organization-based access
DROP POLICY IF EXISTS "Users can view own org POs" ON purchase_orders;
CREATE POLICY "Users can view own org POs" ON purchase_orders
    FOR SELECT TO authenticated
    USING (organization_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own org POs" ON purchase_orders;
CREATE POLICY "Users can insert own org POs" ON purchase_orders
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own org POs" ON purchase_orders;
CREATE POLICY "Users can update own org POs" ON purchase_orders
    FOR UPDATE TO authenticated
    USING (organization_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can delete own org POs" ON purchase_orders;
CREATE POLICY "Users can delete own org POs" ON purchase_orders
    FOR DELETE TO authenticated
    USING (organization_id = auth.uid());

-- PO Items: Access via parent PO
DROP POLICY IF EXISTS "Users can view PO items" ON purchase_order_items;
CREATE POLICY "Users can view PO items" ON purchase_order_items
    FOR SELECT TO authenticated
    USING (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid() AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can insert PO items" ON purchase_order_items;
CREATE POLICY "Users can insert PO items" ON purchase_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update PO items" ON purchase_order_items;
CREATE POLICY "Users can update PO items" ON purchase_order_items
    FOR UPDATE TO authenticated
    USING (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid() AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can delete PO items" ON purchase_order_items;
CREATE POLICY "Users can delete PO items" ON purchase_order_items
    FOR DELETE TO authenticated
    USING (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid()
        )
    );

-- PO Receiving History: Access via parent PO
DROP POLICY IF EXISTS "Users can view receiving history" ON po_receiving_history;
CREATE POLICY "Users can view receiving history" ON po_receiving_history
    FOR SELECT TO authenticated
    USING (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid() AND deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can insert receiving history" ON po_receiving_history;
CREATE POLICY "Users can insert receiving history" ON po_receiving_history
    FOR INSERT TO authenticated
    WITH CHECK (
        purchase_order_id IN (
            SELECT id FROM purchase_orders 
            WHERE organization_id = auth.uid()
        )
    );

-- =============================================
-- 10. GRANT PERMISSIONS
-- =============================================
GRANT SELECT ON currencies TO authenticated;
GRANT ALL ON purchase_orders TO authenticated;
GRANT ALL ON purchase_order_items TO authenticated;
GRANT ALL ON po_receiving_history TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- This migration adds:
-- ✓ Currencies table with multi-currency support
-- ✓ Purchase orders with approval workflow
-- ✓ PO items with quantity tracking
-- ✓ Receiving history with partial delivery support
-- ✓ Auto PO number generation
-- ✓ Auto-calculation of totals and status updates
-- ✓ RLS policies for data security
