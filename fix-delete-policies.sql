-- ========================================
-- QUICK FIX: Enable DELETE Operations
-- Run this in Supabase SQL Editor
-- ========================================

-- Re-enable RLS if disabled
alter table public.settings enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.stock_receipts enable row level security;

-- Drop and recreate DELETE policies
drop policy if exists "Users can delete their settings" on public.settings;
create policy "Users can delete their settings"
  on public.settings for delete
  using (organization_id = auth.uid());

drop policy if exists "Users can delete their own suppliers" on public.suppliers;
create policy "Users can delete their own suppliers"
  on public.suppliers for delete
  using (auth.uid() = organization_id);

drop policy if exists "Users can delete their own products" on public.products;
create policy "Users can delete their own products"
  on public.products for delete
  using (auth.uid() = organization_id);

drop policy if exists "Users can delete their own sales" on public.sales;
create policy "Users can delete their own sales"
  on public.sales for delete
  using (auth.uid() = organization_id);

drop policy if exists "Users can delete their own stock receipts" on public.stock_receipts;
create policy "Users can delete their own stock receipts"
  on public.stock_receipts for delete
  using (auth.uid() = organization_id);

-- Verify policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('settings', 'suppliers', 'products', 'sales', 'stock_receipts')
  AND policyname LIKE '%delete%'
ORDER BY tablename;
