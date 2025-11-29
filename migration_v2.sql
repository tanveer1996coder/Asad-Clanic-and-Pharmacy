-- ========================================
-- MIGRATION V2: Customers, Invoices, Soft Deletes
-- ========================================

-- 1. Create CUSTOMERS table
create table if not exists public.customers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  organization_id uuid references auth.users(id) on delete cascade not null
);

-- Enable RLS for customers
alter table public.customers enable row level security;

-- RLS Policies for customers
create policy "Users can view their own customers" on public.customers for select using (auth.uid() = organization_id);
create policy "Users can insert their own customers" on public.customers for insert with check (auth.uid() = organization_id);
create policy "Users can update their own customers" on public.customers for update using (auth.uid() = organization_id);
create policy "Users can delete their own customers" on public.customers for delete using (auth.uid() = organization_id);

-- 2. Create INVOICES table
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  invoice_number serial, -- Simple auto-increment for human-readable IDs (scoped to table, not org, but simple enough for now)
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric not null default 0,
  discount numeric default 0,
  payment_method text default 'cash', -- cash, card, etc.
  notes text,
  organization_id uuid references auth.users(id) on delete cascade not null
);

-- Enable RLS for invoices
alter table public.invoices enable row level security;

-- RLS Policies for invoices
create policy "Users can view their own invoices" on public.invoices for select using (auth.uid() = organization_id);
create policy "Users can insert their own invoices" on public.invoices for insert with check (auth.uid() = organization_id);
create policy "Users can update their own invoices" on public.invoices for update using (auth.uid() = organization_id);
create policy "Users can delete their own invoices" on public.invoices for delete using (auth.uid() = organization_id);

-- 3. Modify SALES table to link to INVOICES
alter table public.sales add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;
-- We keep organization_id in sales for easier RLS, even though it's on the invoice too.

-- 4. Add SOFT DELETE columns
alter table public.products add column if not exists deleted_at timestamp with time zone;
alter table public.suppliers add column if not exists deleted_at timestamp with time zone;
alter table public.customers add column if not exists deleted_at timestamp with time zone;
-- Sales and Stock Receipts usually shouldn't be deleted, but if they are "voided", we can use this.
alter table public.sales add column if not exists deleted_at timestamp with time zone;
alter table public.stock_receipts add column if not exists deleted_at timestamp with time zone;

-- 5. Indexes for new columns
create index if not exists idx_customers_org on public.customers(organization_id);
create index if not exists idx_invoices_org on public.invoices(organization_id);
create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_sales_invoice on public.sales(invoice_id);
create index if not exists idx_products_deleted on public.products(deleted_at);
