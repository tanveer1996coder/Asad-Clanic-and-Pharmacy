-- ========================================
-- MIGRATION V12: Dashboard and Reports RPC Functions
-- ========================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_near_expiry_products(integer);
DROP FUNCTION IF EXISTS get_low_stock_products();
DROP FUNCTION IF EXISTS get_top_products(integer, integer);
DROP FUNCTION IF EXISTS get_sales_summary(date, date);
DROP FUNCTION IF EXISTS get_profit_summary(date, date);

-- ========================================
-- 1. Get Near Expiry Products
-- ========================================
CREATE OR REPLACE FUNCTION get_near_expiry_products(days_threshold integer DEFAULT 15)
RETURNS TABLE (
    id uuid,
    name text,
    category text,
    stock integer,
    expiry_date date,
    days_until_expiry integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.category,
        p.stock,
        p.expiry_date,
        (p.expiry_date - CURRENT_DATE) as days_until_expiry
    FROM public.products p
    WHERE p.organization_id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.expiry_date IS NOT NULL
        AND p.expiry_date >= CURRENT_DATE
        AND p.expiry_date <= (CURRENT_DATE + days_threshold)
    ORDER BY p.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. Get Low Stock Products
-- ========================================
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
    id uuid,
    name text,
    category text,
    stock integer,
    min_stock_level integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.category,
        p.stock,
        p.min_stock_level
    FROM public.products p
    WHERE p.organization_id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.stock <= p.min_stock_level
    ORDER BY p.stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. Get Top Products (by sales)
-- ========================================
CREATE OR REPLACE FUNCTION get_top_products(limit_count integer DEFAULT 10, days_back integer DEFAULT 30)
RETURNS TABLE (
    product_id uuid,
    product_name text,
    total_quantity bigint,
    total_revenue numeric,
    sales_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        SUM(s.quantity)::bigint as total_quantity,
        SUM(s.quantity * s.price_at_sale) as total_revenue,
        COUNT(s.id)::bigint as sales_count
    FROM public.products p
    INNER JOIN public.sales s ON p.id = s.product_id
    WHERE p.organization_id = auth.uid()
        AND s.organization_id = auth.uid()
        AND p.deleted_at IS NULL
        AND s.deleted_at IS NULL
        AND s.sale_date >= (CURRENT_DATE - days_back)
    GROUP BY p.id, p.name
    ORDER BY total_quantity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. Get Sales Summary
-- ========================================
CREATE OR REPLACE FUNCTION get_sales_summary(start_date date, end_date date)
RETURNS TABLE (
    total_sales bigint,
    total_revenue numeric,
    total_items_sold bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id)::bigint as total_sales,
        SUM(s.quantity * s.price_at_sale) as total_revenue,
        SUM(s.quantity)::bigint as total_items_sold
    FROM public.sales s
    WHERE s.organization_id = auth.uid()
        AND s.deleted_at IS NULL
        AND s.sale_date >= start_date
        AND s.sale_date <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Get Profit Summary
-- ========================================
CREATE OR REPLACE FUNCTION get_profit_summary(start_date date, end_date date)
RETURNS TABLE (
    total_revenue numeric,
    total_cost numeric,
    total_profit numeric,
    profit_margin numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(s.quantity * s.price_at_sale) as total_revenue,
        SUM(s.quantity * COALESCE(p.cost_price, 0)) as total_cost,
        SUM(s.quantity * (s.price_at_sale - COALESCE(p.cost_price, 0))) as total_profit,
        CASE 
            WHEN SUM(s.quantity * s.price_at_sale) > 0 
            THEN (SUM(s.quantity * (s.price_at_sale - COALESCE(p.cost_price, 0))) / SUM(s.quantity * s.price_at_sale)) * 100
            ELSE 0
        END as profit_margin
    FROM public.sales s
    INNER JOIN public.products p ON s.product_id = p.id
    WHERE s.organization_id = auth.uid()
        AND p.organization_id = auth.uid()
        AND s.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND s.sale_date >= start_date
        AND s.sale_date <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
