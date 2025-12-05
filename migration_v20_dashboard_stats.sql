-- ========================================
-- MIGRATION V20: Optimized Dashboard Stats
-- ========================================

-- Drop existing functions if they exist to facilitate updates
DROP FUNCTION IF EXISTS get_dashboard_stats(integer);
DROP FUNCTION IF EXISTS get_sales_chart_data(integer);

-- 1. Get All Dashboard Stats in One Go
-- Returns: today_sales, today_revenue, low_stock_count, total_products, total_stock, near_expiry_count
CREATE OR REPLACE FUNCTION get_dashboard_stats(expiry_days_threshold integer DEFAULT 15)
RETURNS TABLE (
    today_sales_count bigint,
    today_revenue numeric,
    low_stock_count bigint,
    total_products_count bigint,
    total_stock_count bigint,
    near_expiry_count bigint
) AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_org_id uuid := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        -- Today's Sales
        (SELECT COUNT(*) FROM public.sales s 
         WHERE s.organization_id = v_org_id 
         AND s.sale_date = v_today 
         AND s.deleted_at IS NULL)::bigint as today_sales_count,
         
        (SELECT COALESCE(SUM(s.quantity * s.price_at_sale), 0) FROM public.sales s 
         WHERE s.organization_id = v_org_id 
         AND s.sale_date = v_today 
         AND s.deleted_at IS NULL) as today_revenue,
         
        -- Low Stock
        (SELECT COUNT(*) FROM public.products p 
         WHERE p.organization_id = v_org_id 
         AND p.deleted_at IS NULL 
         AND p.stock <= p.min_stock_level)::bigint as low_stock_count,
         
        -- Total Products
        (SELECT COUNT(*) FROM public.products p 
         WHERE p.organization_id = v_org_id 
         AND p.deleted_at IS NULL)::bigint as total_products_count,

         -- Total Stock (Sum of all items)
        (SELECT COALESCE(SUM(p.stock), 0) FROM public.products p 
         WHERE p.organization_id = v_org_id 
         AND p.deleted_at IS NULL)::bigint as total_stock_count,
         
        -- Near Expiry
        (SELECT COUNT(*) FROM public.products p 
         WHERE p.organization_id = v_org_id 
         AND p.deleted_at IS NULL 
         AND p.expiry_date IS NOT NULL 
         AND p.expiry_date >= v_today 
         AND p.expiry_date <= (v_today + expiry_days_threshold))::bigint as near_expiry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Get Sales Chart Data efficiently
-- Returns daily revenue for the last X days.
-- Handles days with zero sales by using generate_series (optional, but cleaner for frontend)
CREATE OR REPLACE FUNCTION get_sales_chart_data(days_back integer DEFAULT 7)
RETURNS TABLE (
    sale_date date,
    daily_revenue numeric
) AS $$
DECLARE
    v_org_id uuid := auth.uid();
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (days_back - 1), 
            CURRENT_DATE, 
            '1 day'::interval
        )::date AS day
    )
    SELECT 
        ds.day as sale_date,
        COALESCE(SUM(s.quantity * s.price_at_sale), 0) as daily_revenue
    FROM date_series ds
    LEFT JOIN public.sales s ON s.sale_date = ds.day 
        AND s.organization_id = v_org_id 
        AND s.deleted_at IS NULL
    GROUP BY ds.day
    ORDER BY ds.day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
