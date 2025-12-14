-- Migration v21: Add Cash Flow Stats to Dashboard
-- Adds 'today_cash_out' to get_dashboard_stats for "Daily Cash in House" calculation

-- Drop existing function to enable update
DROP FUNCTION IF EXISTS get_dashboard_stats(integer);

CREATE OR REPLACE FUNCTION get_dashboard_stats(expiry_days_threshold integer DEFAULT 15)
RETURNS TABLE (
    today_sales_count bigint,
    today_revenue numeric,
    today_cash_out numeric,
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

        -- Today's Cash Out (Purchase Orders Received Today)
        -- Sum of final_amount for POs fully received today.
        -- Partial receipts are harder to track cash-wise precisely without a separate payments table,
        -- so we use the PO final amount if the actual_delivery_date is today.
        (SELECT COALESCE(SUM(po.final_amount), 0) FROM public.purchase_orders po
         WHERE po.organization_id = v_org_id
         AND po.deleted_at IS NULL
         AND po.status = 'received'
         AND po.actual_delivery_date = v_today) as today_cash_out,
         
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
