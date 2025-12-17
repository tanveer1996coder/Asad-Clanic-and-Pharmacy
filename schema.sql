-- ========================================
-- Medical Store Audit Database Schema
-- Multi-tenancy SaaS with Row Level Security
-- ========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========================================
-- 0. SETTINGS TABLE (Global App Settings)
-- ========================================
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  key text unique not null,
  value text,
  organization_id uuid references auth.users(id) default auth.uid()
);

-- Enable RLS on settings
alter table public.settings enable row level security;

-- Settings policies
create policy "Users can view their own settings"
  on public.settings for select
  using (auth.uid() = organization_id OR organization_id IS NULL);

create policy "Users can insert their own settings"
  on public.settings for insert
  with check (auth.uid() IS NOT NULL);

create policy "Users can update their own settings"
  on public.settings for update
  using (auth.uid() = organization_id)
  with check (auth.uid() = organization_id);

-- Insert default settings (global, no organization_id)
insert into public.settings (key, value, organization_id) values
  ('store_name', 'Medical Store', NULL),
  ('currency_symbol', '$', NULL),
  ('low_stock_threshold', '10', NULL),
  ('expiry_alert_days', '15', NULL)
on conflict (key) do nothing;

-- ========================================
-- 1. SUPPLIERS TABLE
-- ========================================
create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  portfolio_link text,
  notes text,
  organization_id uuid references auth.users(id) default auth.uid() not null
);

-- ========================================
-- 2. PRODUCTS TABLE
-- ========================================
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text,
  price numeric not null,
  cost_price numeric,
  stock integer default 0,
  min_stock_level integer default 10,
  expiry_date date,
  barcode text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  organization_id uuid references auth.users(id) default auth.uid() not null
);

-- ========================================
-- 3. SALES TABLE
-- ========================================
create table if not exists public.sales (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null,
  price_at_sale numeric not null,
  sale_date date default CURRENT_DATE,
  organization_id uuid references auth.users(id) default auth.uid() not null
);

-- ========================================
-- 4. STOCK RECEIPTS TABLE
-- ========================================
create table if not exists public.stock_receipts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references public.products(id) on delete cascade not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity integer not null,
  cost_price numeric,
  expiry_date date,
  received_date date default CURRENT_DATE,
  notes text,
  organization_id uuid references auth.users(id) default auth.uid() not null
);

-- ========================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.stock_receipts enable row level security;

-- ========================================
-- 6. DROP EXISTING POLICIES (if any)
-- ========================================
drop policy if exists "Users can view their own suppliers" on public.suppliers;
drop policy if exists "Users can insert their own suppliers" on public.suppliers;
drop policy if exists "Users can update their own suppliers" on public.suppliers;
drop policy if exists "Users can delete their own suppliers" on public.suppliers;

drop policy if exists "Users can view their own products" on public.products;
drop policy if exists "Users can insert their own products" on public.products;
drop policy if exists "Users can update their own products" on public.products;
drop policy if exists "Users can delete their own products" on public.products;

drop policy if exists "Users can view their own sales" on public.sales;
drop policy if exists "Users can insert their own sales" on public.sales;
drop policy if exists "Users can update their own sales" on public.sales;
drop policy if exists "Users can delete their own sales" on public.sales;

drop policy if exists "Users can view their own stock receipts" on public.stock_receipts;
drop policy if exists "Users can insert their own stock receipts" on public.stock_receipts;
drop policy if exists "Users can update their own stock receipts" on public.stock_receipts;
drop policy if exists "Users can delete their own stock receipts" on public.stock_receipts;

-- ========================================
-- 7. CREATE RLS POLICIES
-- ========================================

-- Suppliers Policies
create policy "Users can view their own suppliers"
  on public.suppliers for select
  using (auth.uid() = organization_id);

create policy "Users can insert their own suppliers"
  on public.suppliers for insert
  with check (auth.uid() IS NOT NULL);

create policy "Users can update their own suppliers"
  on public.suppliers for update
  using (auth.uid() = organization_id)
  with check (auth.uid() = organization_id);

create policy "Users can delete their own suppliers"
  on public.suppliers for delete
  using (auth.uid() = organization_id);

-- Products Policies
create policy "Users can view their own products"
  on public.products for select
  using (auth.uid() = organization_id);

create policy "Users can insert their own products"
  on public.products for insert
  with check (auth.uid() IS NOT NULL);

create policy "Users can update their own products"
  on public.products for update
  using (auth.uid() = organization_id)
  with check (auth.uid() = organization_id);

create policy "Users can delete their own products"
  on public.products for delete
  using (auth.uid() = organization_id);

-- Sales Policies
create policy "Users can view their own sales"
  on public.sales for select
  using (auth.uid() = organization_id);

create policy "Users can insert their own sales"
  on public.sales for insert
  with check (auth.uid() IS NOT NULL);

create policy "Users can update their own sales"
  on public.sales for update
  using (auth.uid() = organization_id)
  with check (auth.uid() = organization_id);

create policy "Users can delete their own sales"
  on public.sales for delete
  using (auth.uid() = organization_id);

-- Stock Receipts Policies
create policy "Users can view their own stock receipts"
  on public.stock_receipts for select
  using (auth.uid() = organization_id);

create policy "Users can insert their own stock receipts"
  on public.stock_receipts for insert
  with check (auth.uid() IS NOT NULL);

create policy "Users can update their own stock receipts"
  on public.stock_receipts for update
  using (auth.uid() = organization_id)
  with check (auth.uid() = organization_id);

create policy "Users can delete their own stock receipts"
  on public.stock_receipts for delete
  using (auth.uid() = organization_id);

-- ========================================
-- 8. DATABASE FUNCTIONS (RPC)
-- ========================================

-- Drop existing functions to avoid conflicts
drop function if exists decrease_stock(uuid, integer);
drop function if exists add_stock(uuid, integer, date, numeric);

-- Function to decrease stock on sale
create or replace function decrease_stock(p_id uuid, q_sold integer)
returns void as $$
begin
  update public.products
  set stock = stock - q_sold
  where id = p_id and organization_id = auth.uid();
end;
$$ language plpgsql security definer;

-- Function to add stock
create or replace function add_stock(p_id uuid, q_added integer, new_expiry date, new_cost numeric)
returns void as $$
begin
  update public.products
  set 
    stock = stock + q_added,
    expiry_date = coalesce(new_expiry, expiry_date),
    cost_price = coalesce(new_cost, cost_price)
  where id = p_id and organization_id = auth.uid();
end;
$$ language plpgsql security definer;

-- ========================================
-- 9. INDEXES FOR PERFORMANCE
-- ========================================
create index if not exists idx_suppliers_org on public.suppliers(organization_id);
create index if not exists idx_products_org on public.products(organization_id);
create index if not exists idx_sales_org on public.sales(organization_id);
create index if not exists idx_stock_receipts_org on public.stock_receipts(organization_id);

create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_sales_product on public.sales(product_id);
create index if not exists idx_stock_receipts_product on public.stock_receipts(product_id);

-- ========================================
-- SCHEMA SETUP COMPLETE
-- ========================================
