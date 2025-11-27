# 🔧 Fix Delete Button Issue

## Problem
Delete buttons are not working - records cannot be deleted from Supabase.

## Root Cause
The DELETE RLS (Row Level Security) policies might not be properly enabled in your Supabase database.

## Solution

### Step 1: Run the Fix Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy all content from `fix-delete-policies.sql`
5. Paste into the SQL editor
6. Click **RUN** (or press Ctrl+Enter)

### Step 2: Verify Policies

At the bottom of the query results, you should see a table showing:

```
tablename    | policyname
-------------|----------------------------------------
products     | Users can delete their own products
sales        | Users can delete their own sales
settings     | Users can delete their settings
stock_receipts| Users can delete their own stock receipts
suppliers    | Users can delete their own suppliers
```

If you see all 5 policies listed, DELETE is now enabled!

### Step 3: Test Delete Button

1. Go back to your app: http://localhost:3000/Asad-Clanic-and-Pharmacy
2. Navigate to Products, Suppliers, or Sales
3. Try clicking a delete button
4. Confirm the deletion
5. The record should be deleted successfully!

---

## If Delete Still Doesn't Work

### Check Browser Console

1. Open the page with delete button
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. Click the delete button
5. Look for error message

**Common errors and fixes:**

#### Error: "auth.uid() is null"
**Fix**: You're not logged in. Log out and log back in.

#### Error: "permission denied"
**Fix**: Run the SQL script above again.

#### Error: "record not found"
**Fix**: The record might already be deleted. Refresh the page.

---

## Alternative: Disable RLS Temporarily (NOT RECOMMENDED)

⚠️ **WARNING**: This removes all security. Only use for testing!

```sql
alter table public.products disable row level security;
alter table public.suppliers disable row level security;
alter table public.sales disable row level security;
```

Test if delete works. If it does, the issue is definitely RLS policies.

Then **RE-ENABLE** immediately:

```sql
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.sales enable row level security;
```

And run the `fix-delete-policies.sql` script.

---

## Why This Happened

RLS policies control who can SELECT, INSERT, UPDATE, and DELETE records. Your schema file had the DELETE policies defined, but they weren't applied to your database.

Running `fix-delete-policies.sql` explicitly creates these policies.

---

## Prevention

Always run the complete `schema-updated.sql` file when setting up a new database to ensure all policies are created.
