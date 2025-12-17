-- ========================================
-- MIGRATION V5: Supplier Contacts
-- ========================================
-- Add support for multiple contact numbers per supplier

-- 1. Create SUPPLIER_CONTACTS table
create table if not exists public.supplier_contacts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  supplier_id uuid references public.suppliers(id) on delete cascade not null,
  contact_name text not null,
  phone text not null,
  whatsapp_enabled boolean default true,
  is_primary boolean default false,
  notes text,
  organization_id uuid references auth.users(id) on delete cascade not null
);

-- 2. Enable RLS for supplier_contacts
alter table public.supplier_contacts enable row level security;

-- 3. Drop existing policies if they exist (prevents duplicate policy error)
drop policy if exists "Users can view their own supplier contacts" on public.supplier_contacts;
drop policy if exists "Users can insert their own supplier contacts" on public.supplier_contacts;
drop policy if exists "Users can update their own supplier contacts" on public.supplier_contacts;
drop policy if exists "Users can delete their own supplier contacts" on public.supplier_contacts;

-- 4. RLS Policies for supplier_contacts
create policy "Users can view their own supplier contacts" 
  on public.supplier_contacts for select 
  using (auth.uid() = organization_id);

create policy "Users can insert their own supplier contacts" 
  on public.supplier_contacts for insert 
  with check (auth.uid() = organization_id);

create policy "Users can update their own supplier contacts" 
  on public.supplier_contacts for update 
  using (auth.uid() = organization_id);

create policy "Users can delete their own supplier contacts" 
  on public.supplier_contacts for delete 
  using (auth.uid() = organization_id);

-- 5. Indexes for performance
create index if not exists idx_supplier_contacts_supplier on public.supplier_contacts(supplier_id);
create index if not exists idx_supplier_contacts_org on public.supplier_contacts(organization_id);
create index if not exists idx_supplier_contacts_primary on public.supplier_contacts(supplier_id, is_primary) where is_primary = true;

-- 6. Function to ensure only one primary contact per supplier
create or replace function enforce_single_primary_contact()
returns trigger as $$
begin
  if NEW.is_primary = true then
    -- Set all other contacts for this supplier to non-primary
    update public.supplier_contacts
    set is_primary = false
    where supplier_id = NEW.supplier_id 
      and id != NEW.id
      and organization_id = NEW.organization_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- 7. Trigger to enforce single primary contact
drop trigger if exists trigger_enforce_single_primary_contact on public.supplier_contacts;
create trigger trigger_enforce_single_primary_contact
  before insert or update on public.supplier_contacts
  for each row
  execute function enforce_single_primary_contact();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
