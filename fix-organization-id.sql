-- ========================================
-- FIX EXISTING DATA: Update organization_id
-- Run this ONLY if delete buttons don't work
-- This updates ALL your existing records to match your current user ID
-- ========================================

-- STEP 1: Find your current user ID
-- Run this first to see your auth.uid()
SELECT auth.uid() as your_user_id;

-- STEP 2: Check if you have any products with NULL or wrong organization_id
SELECT id, name, organization_id 
FROM public.products 
LIMIT 10;

-- STEP 3: Update all your products to use your current user ID
-- REPLACE 'YOUR_USER_ID_HERE' with the UUID from STEP 1
UPDATE public.products 
SET organization_id = auth.uid()
WHERE organization_id IS NULL 
   OR organization_id != auth.uid();

-- STEP 4: Update all your suppliers
UPDATE public.suppliers 
SET organization_id = auth.uid()
WHERE organization_id IS NULL 
   OR organization_id != auth.uid();

-- STEP 5: Update all your sales
UPDATE public.sales 
SET organization_id = auth.uid()
WHERE organization_id IS NULL 
   OR organization_id != auth.uid();

-- STEP 6: Update all your stock receipts
UPDATE public.stock_receipts 
SET organization_id = auth.uid()
WHERE organization_id IS NULL 
   OR organization_id != auth.uid();

-- STEP 7: Update settings
UPDATE public.settings 
SET organization_id = auth.uid()
WHERE organization_id IS NULL 
   OR organization_id != auth.uid();

-- STEP 8: Verify - should show 0 for all
SELECT 
  (SELECT COUNT(*) FROM public.products WHERE organization_id != auth.uid()) as products_mismatched,
  (SELECT COUNT(*) FROM public.suppliers WHERE organization_id != auth.uid()) as suppliers_mismatched,
  (SELECT COUNT(*) FROM public.sales WHERE organization_id != auth.uid()) as sales_mismatched;
